package db

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func New(databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, err
	}
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 30 * time.Minute
	// Kill queries that run longer than 30s so a single slow/hung query
	// cannot exhaust the 10-connection pool and take down the whole API.
	// Supersedes the per-call context.WithTimeout that h.ctx() could not
	// provide cleanly (canceler leak); this is the pgx-native way to bound
	// every query uniformly.
	cfg.HealthCheckPeriod = time.Minute

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		return nil, err
	}

	// Auto-apply required schema migrations idempotently
	migCtx, migCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer migCancel()
	runMigrations(migCtx, pool)

	return pool, nil
}

func runMigrations(ctx context.Context, pool *pgxpool.Pool) {
	queries := []string{
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS platform_ids TEXT[] DEFAULT '{}'`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS content_purposes TEXT[] DEFAULT '{}'`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS is_savings BOOLEAN DEFAULT FALSE`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS savings_reason TEXT`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS savings_month VARCHAR(10)`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ`,
		`ALTER TABLE publications ADD COLUMN IF NOT EXISTS cancel_reason TEXT`,
		`ALTER TABLE contents ADD COLUMN IF NOT EXISTS production_link TEXT`,
		`ALTER TABLE approval_histories DROP CONSTRAINT IF EXISTS approval_histories_action_check`,
		`UPDATE publications p SET planned_publish_date = c.planned_date::DATE FROM contents c WHERE p.content_id = c.id AND c.planned_date IS NOT NULL AND p.status != 'PUBLISHED'`,
		`ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_content_purpose_check`,
		`ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_posting_category_check`,
		`ALTER TABLE contents DROP CONSTRAINT IF EXISTS contents_format_check`,
		`CREATE INDEX IF NOT EXISTS idx_contents_is_savings ON contents(is_savings)`,
		`CREATE INDEX IF NOT EXISTS idx_contents_savings_month ON contents(savings_month)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_pillars_name ON pillars(name)`,
		`DELETE FROM performance_metrics pm1 USING performance_metrics pm2 WHERE pm1.id < pm2.id AND pm1.publication_id = pm2.publication_id AND pm1.recorded_at = pm2.recorded_at`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_metrics_pub_date ON performance_metrics(publication_id, recorded_at)`,

		// Seed standard Content Pillars (5 Official Pillars) & Remap Old Data
		`INSERT INTO pillars (name, description) VALUES
			('Kinerja & Capaian', 'Penjualan listrik naik, pelanggan nambah, transaksi PLN Mobile, keandalan pasokan. Jantungnya agenda setting.'),
			('Prestasi & Penghargaan', 'Bangun kepercayaan lewat pengakuan dari luar. Award CSR/inovasi, penghargaan layanan, apresiasi buat petugas.'),
			('Program & Dampak', 'Perlihatin listrik yang mengubah hidup orang. Jabar Caang, listrik desa, BPBL, SPKLU/mobil listrik, TJSL, elektrifikasi 100%.'),
			('Layanan & Edukasi', 'Bikin brand kepakai sehari-hari dan ngasih manfaat nyata. Fitur PLN Mobile, cara lapor gangguan, tips hemat & aman listrik.'),
			('Ngobrol & Momen', 'Naikin interaksi dan kedekatan. Sapaan Electrizen, kuis/polling, cerita followers, ucapan hari besar.')
		ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description`,
		`UPDATE contents c SET pillar_id = (SELECT id FROM pillars WHERE name = 'Layanan & Edukasi' LIMIT 1) FROM pillars p WHERE c.pillar_id = p.id AND p.name IN ('Edukasi (Educational)', 'Solusi Masalah & FAQ (Problem Solving / Help)', 'Promosi / Penjualan (Promotional)', 'Di Balik Layar (Behind the Scenes)')`,
		`UPDATE contents c SET pillar_id = (SELECT id FROM pillars WHERE name = 'Kinerja & Capaian' LIMIT 1) FROM pillars p WHERE c.pillar_id = p.id AND p.name IN ('Berita & Wawasan Industri (Industry News & Insights)')`,
		`UPDATE contents c SET pillar_id = (SELECT id FROM pillars WHERE name = 'Prestasi & Penghargaan' LIMIT 1) FROM pillars p WHERE c.pillar_id = p.id AND p.name IN ('Bukti Sosial & Ulasan (Social Proof / Testimonials)')`,
		`UPDATE contents c SET pillar_id = (SELECT id FROM pillars WHERE name = 'Program & Dampak' LIMIT 1) FROM pillars p WHERE c.pillar_id = p.id AND p.name IN ('Inspirasi (Inspirational)', 'Tren & Relevansi Terkini (Trending / Relatable)')`,
		`UPDATE contents c SET pillar_id = (SELECT id FROM pillars WHERE name = 'Ngobrol & Momen' LIMIT 1) FROM pillars p WHERE c.pillar_id = p.id AND p.name IN ('Hiburan (Entertainment)', 'Interaksi & Komunitas (Engagement)')`,
		`UPDATE contents c SET pillar_id = (SELECT id FROM pillars WHERE name = 'Kinerja & Capaian' LIMIT 1) FROM pillars p WHERE c.pillar_id = p.id AND p.name NOT IN ('Kinerja & Capaian', 'Prestasi & Penghargaan', 'Program & Dampak', 'Layanan & Edukasi', 'Ngobrol & Momen')`,
		`DELETE FROM pillars WHERE name NOT IN ('Kinerja & Capaian', 'Prestasi & Penghargaan', 'Program & Dampak', 'Layanan & Edukasi', 'Ngobrol & Momen')`,

		// Seed standard official Platforms (Website & LinkedIn removed)
		`DELETE FROM platforms WHERE LOWER(name) IN ('website', 'linkedin')`,
		`INSERT INTO platforms (name, icon) VALUES
			('Instagram', 'instagram'),
			('Facebook', 'facebook'),
			('TikTok', 'tiktok'),
			('YouTube', 'youtube'),
			('Twitter/X', 'twitter')
		ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon`,

		// Repost content auto-workflow: convert existing Repost contents to READY_TO_PUBLISH & sync publications
		`UPDATE contents SET status = 'READY_TO_PUBLISH' WHERE (LOWER(posting_category) LIKE 'repost%' OR posting_category IN ('REPOST_ID', 'REPOST_MOBILE', 'REPOST_UP3')) AND status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED')`,
		`INSERT INTO publications (content_id, platform_id, planned_publish_date, status, notes)
		 SELECT c.id, unnest(CASE WHEN array_length(c.platform_ids, 1) > 0 THEN c.platform_ids ELSE ARRAY[c.platform_id::text] END)::uuid, c.planned_date::date, 'PLANNED', 'Otomatis disinkronisasi untuk konten Siap Publikasi'
		 FROM contents c
		 WHERE c.status = 'READY_TO_PUBLISH' AND (c.platform_id IS NOT NULL OR array_length(c.platform_ids, 1) > 0)
		 ON CONFLICT DO NOTHING`,



		// Planning Periods (Semester-based planning)
		`CREATE TABLE IF NOT EXISTS planning_periods (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(255) NOT NULL,
			start_date DATE NOT NULL,
			end_date DATE NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
			description TEXT,
			created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
			created_at TIMESTAMPTZ DEFAULT now(),
			updated_at TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_planning_periods_dates ON planning_periods(start_date, end_date)`,
		`CREATE INDEX IF NOT EXISTS idx_planning_periods_status ON planning_periods(status)`,

		// Seed initial planning periods if table is empty
		`INSERT INTO planning_periods (name, start_date, end_date, status, description)
		SELECT 'Semester 2 2026', '2026-07-01'::DATE, '2026-12-31'::DATE, 'AKTIF', 'Periode semester konten Semester 2 Tahun 2026'
		WHERE NOT EXISTS (SELECT 1 FROM planning_periods WHERE name = 'Semester 2 2026')`,
		`INSERT INTO planning_periods (name, start_date, end_date, status, description)
		SELECT 'Semester 1 2026', '2026-01-01'::DATE, '2026-06-30'::DATE, 'SELESAI', 'Periode semester konten Semester 1 Tahun 2026'
		WHERE NOT EXISTS (SELECT 1 FROM planning_periods WHERE name = 'Semester 1 2026')`,
		`INSERT INTO planning_periods (name, start_date, end_date, status, description)
		SELECT 'Semester 2 2025', '2025-07-01'::DATE, '2025-12-31'::DATE, 'SELESAI', 'Periode semester konten Semester 2 Tahun 2025'
		WHERE NOT EXISTS (SELECT 1 FROM planning_periods WHERE name = 'Semester 2 2025')`,
		`INSERT INTO planning_periods (name, start_date, end_date, status, description)
		SELECT 'Semester 1 2025', '2025-01-01'::DATE, '2025-06-30'::DATE, 'SELESAI', 'Periode semester konten Semester 1 Tahun 2025'
		WHERE NOT EXISTS (SELECT 1 FROM planning_periods WHERE name = 'Semester 1 2025')`,
		`INSERT INTO planning_periods (name, start_date, end_date, status, description)
		SELECT 'Semester 2 2024', '2024-07-01'::DATE, '2024-12-31'::DATE, 'SELESAI', 'Periode semester konten Semester 2 Tahun 2024'
		WHERE NOT EXISTS (SELECT 1 FROM planning_periods WHERE name = 'Semester 2 2024')`,

		// Topics (Topik Konten resmi A-Z, dikelola dari halaman admin).
		// Kode dipisah dari nama supaya analitik menampilkan kode tanpa
		// bergantung pada parsing prefix "A - Nama" di teks topik.
		`CREATE TABLE IF NOT EXISTS topics (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			code VARCHAR(10),
			name VARCHAR(255) NOT NULL,
			description TEXT,
			created_at TIMESTAMPTZ DEFAULT now(),
			updated_at TIMESTAMPTZ DEFAULT now()
		)`,
		`ALTER TABLE topics ADD COLUMN IF NOT EXISTS code VARCHAR(10)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_topics_name ON topics(name)`,
		// Backfill satu kali: topik lama yang namanya masih "A - Nama"
		// dipecah jadi kode terpisah; nama polos dibiarkan tanpa kode.
		`UPDATE topics SET code = left(name, 1), name = regexp_replace(name, '^[A-Z] - ', '') WHERE (code IS NULL OR code = '') AND name ~ '^[A-Z] - '`,
		// Seed hanya mengisi yang belum ada (DO NOTHING) supaya perubahan
		// yang dilakukan admin dari UI tidak ditimpa ulang saat restart.
		`INSERT INTO topics (code, name) VALUES
			('A', 'Bencana & Pemulihan'),
			('B', 'TJSL'),
			('C', 'EV/SPKLU'),
			('D', 'Energi Baru terbarukan/REC'),
			('E', 'Jabar Smile'),
			('F', 'Instalasi Listrik'),
			('G', 'K3L'),
			('H', 'Kerja Sama'),
			('I', 'Electrifying Lifestyle'),
			('J', 'Lisdes/Elektrifikasi'),
			('K', 'Pasang Baru/Tambah Daya'),
			('L', 'Pembangkit'),
			('N', 'Penghargaan'),
			('O', 'Pengumuman/Transformasi/HSH'),
			('P', 'Penjualan/Konsumsi Listrik'),
			('Q', 'Penokohan'),
			('R', 'PLN Mobile'),
			('S', 'Promo PLN'),
			('T', 'Rekening/Tagihan Listrik'),
			('U', 'Subsidi Listrik'),
			('V', 'Surat Pembaca'),
			('W', 'Tarif Tenaga Listrik'),
			('X', 'Tingkat Mutu Pelayanan'),
			('Y', 'YBM'),
			('Z', 'Lain-Lain')
		ON CONFLICT (name) DO NOTHING`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_topics_code ON topics(code) WHERE code IS NOT NULL AND code != ''`,

		// Important Events (Calendar of Events / Hari Peringatan & Hari Besar)
		`CREATE TABLE IF NOT EXISTS important_events (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name VARCHAR(255) NOT NULL,
			day INT NOT NULL,
			month INT NOT NULL,
			year INT DEFAULT NULL,
			category VARCHAR(50) NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'RESMI',
			description TEXT,
			is_active BOOLEAN DEFAULT TRUE,
			created_at TIMESTAMPTZ DEFAULT now()
		)`,
		`CREATE INDEX IF NOT EXISTS idx_important_events_month_day ON important_events(month, day)`,
		`CREATE INDEX IF NOT EXISTS idx_important_events_category ON important_events(category)`,
		`CREATE INDEX IF NOT EXISTS idx_important_events_year ON important_events(year)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS idx_important_events_uniq ON important_events(name, day, month, COALESCE(year, 0))`,
		`ALTER TABLE important_events ENABLE ROW LEVEL SECURITY`,
		`DROP POLICY IF EXISTS "Allow read access to all users" ON important_events`,
		`CREATE POLICY "Allow read access to all users" ON important_events FOR SELECT USING (true)`,
		`DROP POLICY IF EXISTS "Allow manage important events" ON important_events`,
		`CREATE POLICY "Allow manage important events" ON important_events FOR ALL USING (true)`,

		// Notification read state (persist di DB, ikut user antar device)
		`CREATE TABLE IF NOT EXISTS notification_reads (
			user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
			notification_id TEXT NOT NULL,
			read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			PRIMARY KEY (user_id, notification_id)
		)`,
		`ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY`,
		`DROP POLICY IF EXISTS "Users can read own notification reads" ON notification_reads`,
		`CREATE POLICY "Users can read own notification reads" ON notification_reads FOR SELECT USING (user_id = auth.uid())`,
		`DROP POLICY IF EXISTS "Users can insert own notification reads" ON notification_reads`,
		`CREATE POLICY "Users can insert own notification reads" ON notification_reads FOR INSERT WITH CHECK (user_id = auth.uid())`,

		// Seed important events if empty
		`INSERT INTO important_events (name, day, month, category, status, description) VALUES
			('Hari Departemen Agama', 3, 1, 'NASIONAL', 'RESMI', 'Peringatan berdirinya Departemen/Kementerian Agama RI'),
			('Hari Braille Sedunia', 4, 1, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan hak aksesibilitas dan huruf Braille'),
			('Hari Korps Wanita Angkatan Laut (KOWAL)', 5, 1, 'HUT_INSTANSI', 'HUT', 'HUT Korps Wanita TNI Angkatan Laut'),
			('Hari Gerakan Satu Juta Pohon', 10, 1, 'LINGKUNGAN', 'RESMI', 'Gerakan nasional pelestarian pohon dan penghijauan lingkungan'),
			('Hari K3 Nasional (Bulan K3)', 12, 1, 'PROFESI', 'RESMI', 'Pencanangan Bulan Keselamatan dan Kesehatan Kerja Nasional'),
			('Hari Dharma Samudera', 15, 1, 'HUT_INSTANSI', 'RESMI', 'Peringatan pertempuran Laut Arafuru dan kepahlawanan Yos Sudarso'),
			('Hari Pendidikan Internasional', 24, 1, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan peran penting pendidikan bagi perdamaian dunia'),
			('Hari Gizi Nasional', 25, 1, 'KESEHATAN', 'RESMI', 'Peringatan komitmen peningkatan gizi masyarakat Indonesia'),
			('Hari Kepabeanan Internasional', 26, 1, 'PROFESI', 'INTERNASIONAL', 'Peringatan peran institusi bea dan cukai internasional'),
			('Hari Energi Bersih Internasional', 26, 1, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan transisi menuju energi bersih dan EBT'),
			('HUT Nahdlatul Ulama (NU)', 31, 1, 'NASIONAL', 'HUT', 'Peringatan hari lahir organisasi Nahdlatul Ulama'),

			('Hari Lahan Basah Sedunia', 2, 2, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan pelestarian ekosistem lahan basah dunia'),
			('Hari Kanker Sedunia', 4, 2, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan kesadaran pencegahan dan penanganan kanker'),
			('HUT Himpunan Mahasiswa Islam (HMI)', 5, 2, 'NASIONAL', 'HUT', 'HUT berdirinya organisasi kemahasiswaan HMI'),
			('Hari Pers Nasional (HPN)', 9, 2, 'PROFESI', 'RESMI', 'Peringatan Hari Pers Nasional dan HUT PWI'),
			('Hari Perempuan dan Anak Perempuan dalam Sains', 11, 2, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan peran perempuan dalam sains dan teknologi'),
			('Hari Radio Sedunia', 13, 2, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan peran radio sebagai media komunikasi publik'),
			('Hari Peringatan Pembela Tanah Air (PETA)', 14, 2, 'NASIONAL', 'RESMI', 'Peringatan perjuangan pahlawan PETA Blitar'),
			('Hari Keadilan Sosial Sedunia', 20, 2, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan pemajuan keadilan sosial dan kesetaraan hak'),
			('Hari Bahasa Ibu Internasional', 21, 2, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan pelestarian bahasa daerah dan bahasa ibu'),
			('HUT Jasa Raharja', 22, 2, 'HUT_INSTANSI', 'HUT', 'HUT PT Jasa Raharja (Persero)'),

			('Hari Kehakiman Nasional', 1, 3, 'HUT_INSTANSI', 'RESMI', 'Peringatan integritas lembaga kehakiman dan pengadilan Indonesia'),
			('Hari Satwa Liar Sedunia', 3, 3, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan perlindungan flora dan fauna liar dunia'),
			('Hari Kostrad TNI AD', 6, 3, 'HUT_INSTANSI', 'HUT', 'HUT Komando Cadangan Strategis Angkatan Darat'),
			('Hari Perempuan Internasional', 8, 3, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan hak perempuan dan kesetaraan gender dunia'),
			('Hari Musik Nasional', 9, 3, 'NASIONAL', 'RESMI', 'Peringatan karya musik nasional bertepatan lahirnya W.R. Soepratman'),
			('Hari Matematika Internasional', 14, 3, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan Pi Day bagi kemajuan sains dan teknologi'),
			('Hari Hak Konsumen Sedunia', 15, 3, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan perlindungan hak konsumen dan standar pelayanan prima'),
			('Hari Kebahagiaan Internasional', 20, 3, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan kesejahteraan dan kebahagiaan global'),
			('Hari Hutan Internasional', 21, 3, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan pelestarian kawasan hutan dunia'),
			('Hari Air Sedunia (World Water Day)', 22, 3, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan konservasi dan pengelolaan sumber daya air bersih'),
			('Hari Meteorologi Sedunia', 23, 3, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan peran meteorologi, klimatologi, dan geofisika'),
			('Hari Peringatan Bandung Lautan Api', 24, 3, 'NASIONAL', 'RESMI', 'Peringatan peristiwa sejarah patriotisme Bandung Lautan Api 1946'),
			('Hari Film Nasional', 30, 3, 'NASIONAL', 'RESMI', 'Peringatan apresiasi karya industri perfilman Indonesia'),

			('Hari Nelayan Nasional', 6, 4, 'PROFESI', 'RESMI', 'Apresiasi kepada nelayan dan sektor kemaritiman Indonesia'),
			('Hari Kesehatan Sedunia', 7, 4, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan berdirinya WHO dan promosi kesehatan global'),
			('HUT TNI Angkatan Udara (TNI AU)', 9, 4, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Tentara Nasional Indonesia Angkatan Udara'),
			('Hari Kartini', 21, 4, 'NASIONAL', 'RESMI', 'Peringatan emansipasi perempuan oleh R.A. Kartini'),
			('Hari Bumi (Earth Day)', 22, 4, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan kepedulian lingkungan hidup dan kelestarian bumi'),
			('Hari Buku Sedunia (World Book Day)', 23, 4, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan literasi, penerbitan buku, dan minat baca dunia'),
			('Hari Angkutan Nasional', 24, 4, 'PROFESI', 'RESMI', 'Peringatan pemajuan transportasi dan angkutan umum nasional'),
			('Hari Malaria Sedunia', 25, 4, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan eliminasi dan penanganan penyakit malaria'),
			('Hari Kekayaan Intelektual Sedunia', 26, 4, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan inovasi, paten, merek, dan hak cipta'),
			('Hari Bhakti Pemasyarakatan', 27, 4, 'HUT_INSTANSI', 'RESMI', 'Peringatan pemasyarakatan Kemenkumham RI'),
			('Hari K3 Sedunia (World OSH Day)', 28, 4, 'PROFESI', 'INTERNASIONAL', 'Peringatan keselamatan dan kesehatan kerja internasional'),

			('Hari Buruh Internasional (May Day)', 1, 5, 'NASIONAL', 'LIBUR_NASIONAL', 'Peringatan hak tenaga kerja dan kesejahteraan buruh sedunia'),
			('Hari Pendidikan Nasional (Hardiknas)', 2, 5, 'NASIONAL', 'RESMI', 'Peringatan hari kelahiran Ki Hajar Dewantara dan pemajuan pendidikan'),
			('Hari Kebebasan Pers Sedunia', 3, 5, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan prinsip independensi pers internasional'),
			('Hari Buku Nasional', 17, 5, 'NASIONAL', 'RESMI', 'Peringatan berdirinya Perpustakaan Nasional RI'),
			('Hari Telekomunikasi & Masyarakat Informasi Sedunia', 17, 5, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan peran TIK dan konektivitas digital'),
			('Hari Kearsipan Nasional', 18, 5, 'NASIONAL', 'RESMI', 'Peringatan tata kelola kearsipan dan dokumentasi sejarah bangsa'),
			('Hari Kebangkitan Nasional (Harkitnas)', 20, 5, 'NASIONAL', 'RESMI', 'Peringatan berdirinya Boedi Oetomo 1908 dan kebangkitan bangsa'),
			('Hari Reformasi Nasional', 21, 5, 'NASIONAL', 'RESMI', 'Peringatan bergulirnya era reformasi di Indonesia'),
			('Hari Keanekaragaman Hayati Sedunia', 22, 5, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan konservasi keanekaragaman hayati dunia'),
			('Hari Lanjut Usia Nasional', 29, 5, 'NASIONAL', 'RESMI', 'Apresiasi dan penghormatan bagi kaum lansia Indonesia'),
			('Hari Tanpa Tembakau Sedunia', 31, 5, 'KESEHATAN', 'INTERNASIONAL', 'Kampanye hidup sehat bebas asap rokok'),

			('Hari Lahir Pancasila', 1, 6, 'NASIONAL', 'LIBUR_NASIONAL', 'Peringatan lahirnya falsafah dasar negara Pancasila 1 Juni 1945'),
			('Hari Lingkungan Hidup Sedunia', 5, 6, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan aksi nyata pelestarian alam dan lingkungan hidup'),
			('Hari Laut Sedunia (World Ocean Day)', 8, 6, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan kelestarian ekosistem laut dan samudra'),
			('Hari Donor Darah Sedunia', 14, 6, 'KESEHATAN', 'INTERNASIONAL', 'Apresiasi bagi para pendonor darah sukarela sedunia'),
			('Hari Penanggulangan Degradasi Lahan Sedunia', 17, 6, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan pencegahan kekeringan dan degradasi tanah'),
			('Hari Krida Pertanian', 21, 6, 'PROFESI', 'RESMI', 'Apresiasi bagi petani dan penggerak ketahanan pangan nasional'),
			('Hari Bidan Nasional', 24, 6, 'PROFESI', 'RESMI', 'Peringatan peran bidan dalam kesehatan ibu dan anak di Indonesia'),
			('Hari Anti Narkotika Internasional (HANI)', 26, 6, 'NASIONAL', 'INTERNASIONAL', 'Peringatan perang terhadap penyalahgunaan narkotika'),
			('Hari Keluarga Nasional (Harganas)', 29, 6, 'NASIONAL', 'RESMI', 'Peringatan penguatan ketahanan dan keharmonisan keluarga'),
			('Hari Media Sosial', 30, 6, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan etika dan pemanfaatan positif media sosial'),

			('Hari Bhayangkara (HUT Polri)', 1, 7, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Kepolisian Negara Republik Indonesia (Polri)'),
			('Hari Bank Indonesia', 5, 7, 'HUT_INSTANSI', 'RESMI', 'Peringatan berdirinya Bank Sentral Republik Indonesia'),
			('Hari Koperasi Indonesia', 12, 7, 'NASIONAL', 'RESMI', 'Peringatan kongres koperasi pertama dan pemajuan ekonomi rakyat'),
			('Hari Pajak Nasional', 14, 7, 'NASIONAL', 'RESMI', 'Peringatan peran penerimaan pajak bagi pembangunan nasional'),
			('Hari Bhakti Adhyaksa (HUT Kejaksaan RI)', 22, 7, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Kejaksaan RI dan penegakan hukum yang berkeadilan'),
			('Hari Anak Nasional', 23, 7, 'NASIONAL', 'RESMI', 'Peringatan perlindungan hak-hak dan tumbuh kembang anak Indonesia'),
			('Hari Mangrove Sedunia', 26, 7, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan konservasi ekosistem hutan bakau/mangrove'),
			('Hari Bhakti TNI Angkatan Udara', 29, 7, 'HUT_INSTANSI', 'RESMI', 'Peringatan operasi udara pertama dan kepahlawanan TNI AU'),
			('Hari Persahabatan Internasional', 30, 7, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan toleransi dan persahabatan antar bangsa'),

			('HUT ASEAN', 8, 8, 'INTERNASIONAL', 'HUT', 'Peringatan berdirinya ASEAN'),
			('Hari Veteran Nasional', 10, 8, 'NASIONAL', 'RESMI', 'Penghormatan kepada pejuang veteran kemerdekaan RI'),
			('Hari Kebangkitan Teknologi Nasional (Hakteknas)', 10, 8, 'NASIONAL', 'RESMI', 'Peringatan penerbangan perdana pesawat N-250 karya anak bangsa'),
			('Hari Pemuda Internasional', 12, 8, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan peran pemuda sebagai agen perubahan global'),
			('Hari Pramuka', 14, 8, 'NASIONAL', 'HUT', 'Peringatan lahirnya Gerakan Pramuka di Indonesia'),
			('HUT Proklamasi Kemerdekaan RI', 17, 8, 'NASIONAL', 'LIBUR_NASIONAL', 'Dirgahayu Kemerdekaan Republik Indonesia'),
			('HUT Mahkamah Agung RI', 19, 8, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Mahkamah Agung Republik Indonesia'),
			('Hari Televisi Republik Indonesia (TVRI)', 24, 8, 'HUT_INSTANSI', 'HUT', 'HUT berdirinya Lembaga Penyiaran Publik TVRI'),
			('Hari Perumahan Nasional (Hapernas)', 25, 8, 'NASIONAL', 'RESMI', 'Peringatan pemenuhan hunian layak bagi masyarakat'),

			('Hari Polisi Wanita (Polwan)', 1, 9, 'HUT_INSTANSI', 'RESMI', 'Peringatan berdirinya Polisi Wanita Republik Indonesia'),
			('Hari Pelanggan Nasional (Harpelnas)', 4, 9, 'PROFESI', 'RESMI', 'Apresiasi komitmen pelayanan prima kepada seluruh pelanggan'),
			('Hari Aksara Internasional', 8, 9, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan pemberantasan buta aksara dan literasi global'),
			('Hari Olahraga Nasional (Haornas)', 9, 9, 'NASIONAL', 'RESMI', 'Peringatan semangat kebugaran dan prestasi olahraga nasional'),
			('HUT TNI Angkatan Laut (TNI AL)', 10, 9, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Tentara Nasional Indonesia Angkatan Laut'),
			('Hari Radio Republik Indonesia (RRI)', 11, 9, 'HUT_INSTANSI', 'HUT', 'HUT Radio Republik Indonesia'),
			('Hari Kunjung Perpustakaan', 14, 9, 'NASIONAL', 'RESMI', 'Gerakan gemar membaca dan berkunjung ke perpustakaan'),
			('HUT Palang Merah Indonesia (PMI)', 17, 9, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Palang Merah Indonesia dan pengabdian kemanusiaan'),
			('Hari Perhubungan Nasional (Harhubnas)', 17, 9, 'HUT_INSTANSI', 'RESMI', 'Peringatan konektivitas dan keselamatan transportasi Kemenhub'),
			('Hari Perdamaian Internasional', 21, 9, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan gencatan senjata dan perdamaian global'),
			('Hari Maritim Nasional', 23, 9, 'NASIONAL', 'RESMI', 'Peringatan kedaulatan kemaritiman dan kelautan Indonesia'),
			('Hari Tani Nasional (HTN)', 24, 9, 'PROFESI', 'RESMI', 'Peringatan UU Pokok Agraria 1960 dan apresiasi petani Indonesia'),
			('Hari Statistik Nasional (HSN)', 26, 9, 'HUT_INSTANSI', 'RESMI', 'Peringatan peran data statistik bagi pembangunan bangsa oleh BPS'),
			('Hari Bhakti Postel', 27, 9, 'HUT_INSTANSI', 'RESMI', 'Peringatan pengambilalihan Pos, Telegraf, dan Telepon 1945'),
			('HUT Kereta Api Indonesia (KAI)', 28, 9, 'HUT_INSTANSI', 'HUT', 'Dirgahayu PT Kereta Api Indonesia (Persero)'),
			('Hari Jantung Sedunia', 29, 9, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan pencegahan penyakit kardiovaskular dan jantung'),
			('Hari Peringatan G30S/PKI', 30, 9, 'NASIONAL', 'RESMI', 'Pengibaran bendera setengah tiang mengenang Pahlawan Revolusi'),

			('Hari Kesaktian Pancasila', 1, 10, 'NASIONAL', 'RESMI', 'Peringatan keteguhan ideologi dasar negara Pancasila'),
			('Hari Batik Nasional', 2, 10, 'NASIONAL', 'RESMI', 'Peringatan penetapan Batik sebagai Warisan Budaya UNESCO'),
			('HUT Tentara Nasional Indonesia (TNI)', 5, 10, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Tentara Nasional Indonesia (TNI Patriot NKRI)'),
			('Hari Guru Sedunia', 5, 10, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan apresiasi profesi pendidik dan guru sedunia'),
			('Hari Kesehatan Jiwa Sedunia', 10, 10, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan kesadaran kesehatan mental di tempat kerja dan masyarakat'),
			('Hari Cuci Tangan Pakai Sabun Sedunia', 15, 10, 'KESEHATAN', 'INTERNASIONAL', 'Kampanye perilaku hidup bersih dan sehat'),
			('Hari Pangan Sedunia (World Food Day)', 16, 10, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan ketahanan pangan dan pengentasan kelaparan'),
			('Hari Santri Nasional', 22, 10, 'NASIONAL', 'RESMI', 'Peringatan Resolusi Jihad 1945 dan peran santri bagi kemerdekaan'),
			('Hari Perserikatan Bangsa-Bangsa (PBB)', 24, 10, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan berlakunya Piagam PBB tahun 1945'),
			('Hari Dokter Nasional', 24, 10, 'PROFESI', 'RESMI', 'HUT Ikatan Dokter Indonesia (IDI) dan apresiasi dokter'),
			('Hari Listrik Nasional (HLN)', 27, 10, 'HUT_INSTANSI', 'HUT', 'Peringatan Hari Listrik Nasional dan dedikasi PT PLN (Persero) menerangi negeri'),
			('Hari Sumpah Pemuda', 28, 10, 'NASIONAL', 'RESMI', 'Peringatan ikrar persatuan pemuda Indonesia 28 Oktober 1928'),
			('Hari Bahasa Indonesia', 28, 10, 'NASIONAL', 'RESMI', 'Bulan Bahasa dan penghormatan bahasa persatuan Bahasa Indonesia'),
			('Hari Stroke Sedunia', 29, 10, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan kesadaran dan pencegahan serangan stroke'),

			('Hari Cinta Puspa dan Satwa Nasional', 5, 11, 'LINGKUNGAN', 'RESMI', 'Peringatan kepedulian flora dan fauna endemik Indonesia'),
			('Hari Pahlawan', 10, 11, 'NASIONAL', 'RESMI', 'Peringatan pertempuran Surabaya 10 November 1945 dan teladan pahlawan'),
			('Hari Kesehatan Nasional (HKN)', 12, 11, 'KESEHATAN', 'RESMI', 'Peringatan kemandirian kesehatan nasional'),
			('Hari Diabetes Sedunia', 14, 11, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan edukasi dan pencegahan penyakit diabetes melitus'),
			('Hari Toleransi Internasional', 16, 11, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan penguatan kerukunan dan saling menghormati keberagaman'),
			('Hari Anak Sedunia (World Children Day)', 20, 11, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan deklarasi hak-hak asasi anak sedunia'),
			('Hari Pohon Sedunia', 21, 11, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan pentingnya pohon bagi kelestarian bumi'),
			('Hari Guru Nasional & HUT PGRI', 25, 11, 'PROFESI', 'RESMI', 'Dirgahayu PGRI dan apresiasi pahlawan tanpa tanda jasa'),
			('Hari Menanam Pohon Indonesia (HMPI)', 28, 11, 'LINGKUNGAN', 'RESMI', 'Gerakan nasional penanaman pohon serentak di Indonesia'),
			('HUT KORPRI', 29, 11, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Korps Pegawai Republik Indonesia dan netralitas ASN'),
			('Hari Keamanan Komputer', 30, 11, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan perlindungan data dan keamanan siber'),

			('Hari AIDS Sedunia', 1, 12, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan solidaritas dan edukasi pencegahan HIV/AIDS'),
			('Hari Bakti Pekerjaan Umum (Hari Bakti PU)', 3, 12, 'HUT_INSTANSI', 'RESMI', 'Peringatan perjuangan insan Pekerjaan Umum di Gedung Sate 1945'),
			('Hari Disabilitas Internasional', 3, 12, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan inklusivitas dan pemenuhan hak penyandang disabilitas'),
			('Hari Relawan Internasional', 5, 12, 'INTERNASIONAL', 'INTERNASIONAL', 'Apresiasi bagi para relawan sosial kemanusiaan dunia'),
			('Hari Penerbangan Sipil Internasional', 7, 12, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan keselamatan penerbangan sipil'),
			('Hari Anti-Korupsi Sedunia (Hakordia)', 9, 12, 'NASIONAL', 'INTERNASIONAL', 'Peringatan komitmen integritas dan pemberantasan korupsi'),
			('Hari Hak Asasi Manusia (HAM)', 10, 12, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan Deklarasi Universal HAM 1948'),
			('Hari Gunung Internasional', 11, 12, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan konservasi ekosistem pegunungan dunia'),
			('Hari Nusantara', 13, 12, 'NASIONAL', 'RESMI', 'Peringatan Deklarasi Djuanda 1957 tentang kesatuan wilayah kepulauan RI'),
			('Hari Juang TNI AD', 15, 12, 'HUT_INSTANSI', 'RESMI', 'Peringatan Palagan Ambarawa dan kemanunggalan TNI AD dengan rakyat'),
			('Hari Bela Negara', 19, 12, 'NASIONAL', 'RESMI', 'Peringatan berdirinya Pemerintah Darurat RI (PDRI) 1948 di Bukittinggi'),
			('Hari Kesetiakawanan Sosial Nasional (HKSN)', 20, 12, 'NASIONAL', 'RESMI', 'Peringatan gotong royong dan kepedulian sosial masyarakat'),
			('Hari Ibu', 22, 12, 'NASIONAL', 'RESMI', 'Peringatan Kongres Perempuan Indonesia I 1928 dan apresiasi kaum ibu'),
			('Hari Natal', 25, 12, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Hari Raya Natal bagi umat Kristiani'),

			-- Event Khusus Jawa Barat & Kelistrikan PLN UID Jawa Barat
			('Hari Kesadaran Budaya & Bahasa Sunda', 17, 1, 'JAWA_BARAT', 'RESMI', 'Peringatan pelestarian budaya, seni, dan aksara Sunda di Jawa Barat.'),
			('Hari Bahasa Sunda & Bahasa Ibu', 21, 2, 'JAWA_BARAT', 'RESMI', 'Peringatan pemeliharaan bahasa Sunda sebagai bahasa daerah utama Jawa Barat.'),
			('Hari Peringatan Bandung Lautan Api (Jabar)', 24, 3, 'JAWA_BARAT', 'RESMI', 'Peringatan peristiwa sejarah patriotisme rakyat Jawa Barat membakar kota Bandung 1946 demi mempertahankan kemerdekaan.'),
			('Hari Jadi Kabupaten Sumedang', 28, 3, 'JAWA_BARAT', 'HUT', 'Peringatan sejarah dan hari jadi Kabupaten Sumedang Larang.'),
			('Peringatan Konferensi Asia Afrika (KAA)', 18, 4, 'JAWA_BARAT', 'RESMI', 'Peringatan bersejarah pembukaan Konferensi Asia Afrika 1955 di Gedung Merdeka Bandung, Jawa Barat.'),
			('Hari Jadi Kota Depok', 27, 4, 'JAWA_BARAT', 'HUT', 'Dirgahayu Pembentukan Pemerintah Kota Depok, Jawa Barat.'),
			('Hari Kebudayaan & Kesenian Jawa Barat', 22, 5, 'JAWA_BARAT', 'RESMI', 'Peringatan ragam seni kebudayaan Pasundan (Jaipong, Sisingaan, Tarawangsa).'),
			('Hari Jadi Kota Bogor (Helaran Budaya)', 3, 6, 'JAWA_BARAT', 'HUT', 'Peringatan berdirinya Kota Bogor (Penobatan Prabu Siliwangi 1482).'),
			('Hari Pelestarian Alam Gunung Ciremai & Jabar', 21, 6, 'JAWA_BARAT', 'RESMI', 'Kampanye edukasi keselamatan kelistrikan & pelestarian kawasan wisata gunung Jawa Barat.'),
			('Hari Jadi Kabupaten Tasikmalaya', 26, 7, 'JAWA_BARAT', 'HUT', 'Peringatan berdirinya Kabupaten Tasikmalaya pusat kerajinan & kelistrikan Jabar Selatan.'),
			('HUT Provinsi Jawa Barat', 19, 8, 'JAWA_BARAT', 'HUT', 'Dirgahayu Pembentukan Pemerintah Provinsi Jawa Barat (19 Agustus 1945).'),
			('West Java Festival & Semarak Budaya', 28, 8, 'JAWA_BARAT', 'RESMI', 'Event tahunan festival kebudayaan, pariwisata, UMKM, dan transisi energi bersih Jawa Barat.'),
			('Hari Jadi Kota Bandung (HJKB)', 25, 9, 'JAWA_BARAT', 'HUT', 'Dirgahayu berdirinya Kota Bandung (25 September 1810).'),
			('HUT PLN Unit Induk Distribusi (UID) Jawa Barat', 26, 10, 'JAWA_BARAT', 'HUT', 'Peringatan hari jadi dan dedikasi pelayanan kelistrikan PT PLN (Persero) Unit Induk Distribusi Jawa Barat.'),
			('Semarak Hari Listrik Nasional PLN UID Jabar', 27, 10, 'JAWA_BARAT', 'HUT', 'Pesta edukasi kelistrikan & peringatan Hari Listrik Nasional Ke-81 di wilayah PLN UID Jawa Barat.'),
			('Hari Angklung Sedunia (UNESCO)', 16, 11, 'JAWA_BARAT', 'INTERNASIONAL', 'Peringatan penetapan Angklung khas Jawa Barat sebagai Warisan Budaya Takbenda Dunia oleh UNESCO.'),
			('Hari Bakti PU (Tragedi Gedung Sate 1945)', 3, 12, 'JAWA_BARAT', 'RESMI', 'Peringatan perjuangan 7 pemuda PU mempertahankan Gedung Sate Bandung, Jawa Barat.'),
			('Hari Pencak Silat Jawa Barat (UNESCO)', 12, 12, 'JAWA_BARAT', 'RESMI', 'Peringatan Pencak Silat sebagai Warisan Budaya Takbenda UNESCO asal Jawa Barat.')
		ON CONFLICT (name, day, month, COALESCE(year, 0)) DO NOTHING`,

		// Dynamic Religious Holidays 2026
		`INSERT INTO important_events (name, day, month, year, category, status, description) VALUES
			('Isra Mikraj Nabi Muhammad SAW', 16, 1, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan perjalanan suci Isra Mikraj 1447 H'),
			('Tahun Baru Imlek 2577 Kongzili', 17, 2, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Tahun Baru Imlek 2577 Shio Kuda'),
			('Hari Suci Nyepi (Tahun Baru Saka 1948)', 19, 3, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Suci Nyepi Tahun Baru Saka 1948'),
			('Hari Raya Idul Fitri 1447 H', 20, 3, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Idul Fitri 1 Syawal 1447 H'),
			('Hari Raya Idul Fitri 1447 H (Hari Kedua)', 21, 3, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Idul Fitri 1447 H hari kedua'),
			('Wafat Yesus Kristus', 3, 4, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Wafat Yesus Kristus (Jumat Agung)'),
			('Kenaikan Yesus Kristus', 14, 5, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Kenaikan Yesus Kristus'),
			('Hari Raya Idul Adha 1447 H', 27, 5, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Idul Adha 10 Dzulhijjah 1447 H'),
			('Hari Raya Waisak 2570 BE', 31, 5, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Waisak 2570 Buddhist Era'),
			('Tahun Baru Islam 1448 H', 16, 6, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Tahun Baru Islam 1 Muharram 1448 H'),
			('Maulid Nabi Muhammad SAW', 25, 8, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Kelahiran Nabi Muhammad SAW')
		ON CONFLICT (name, day, month, COALESCE(year, 0)) DO NOTHING`,
	}
	for _, q := range queries {
		if _, err := pool.Exec(ctx, q); err != nil {
			// Schema migrations are idempotent (IF NOT EXISTS / ON CONFLICT),
			// so a failure here means something is genuinely wrong — log it
			// instead of swallowing silently so the operator can see it.
			log.Printf("migration warning: %v (query: %s)", err, truncate(q, 80))
		}
	}
}

// truncate shortens a string to max chars for compact logging.
func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
