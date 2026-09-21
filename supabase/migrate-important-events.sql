-- ============================================================================
-- Migration: important_events (Master Kalender Hari Peringatan & Hari Besar)
-- ============================================================================

CREATE TABLE IF NOT EXISTS important_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    day INT NOT NULL,              -- 1 - 31
    month INT NOT NULL,            -- 1 - 12 (Januari = 1, Desember = 12)
    year INT DEFAULT NULL,         -- NULL jika berulang tahunan, atau YYYY jika hari raya dinamis
    category VARCHAR(50) NOT NULL, -- 'HUT_INSTANSI', 'NASIONAL', 'INTERNASIONAL', 'LINGKUNGAN', 'KESEHATAN', 'PROFESI', 'KEAGAMAAN'
    status VARCHAR(50) NOT NULL DEFAULT 'RESMI', -- 'RESMI', 'HUT', 'INTERNASIONAL', 'LIBUR_NASIONAL'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_important_events_month_day ON important_events(month, day);
CREATE INDEX IF NOT EXISTS idx_important_events_category ON important_events(category);
CREATE INDEX IF NOT EXISTS idx_important_events_year ON important_events(year);
CREATE UNIQUE INDEX IF NOT EXISTS idx_important_events_uniq ON important_events(name, day, month, COALESCE(year, 0));

-- Enable RLS and allow read access
ALTER TABLE important_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow read access to all users" ON important_events;
CREATE POLICY "Allow read access to all users" ON important_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow manage important events" ON important_events;
CREATE POLICY "Allow manage important events" ON important_events FOR ALL USING (true);

-- ============================================================================
-- SEED DATA: Hari Peringatan Resmi Indonesia & Internasional (Januari - Desember)
-- ============================================================================

INSERT INTO important_events (name, day, month, category, status, description) VALUES
-- JANUARI
('Hari Departemen Agama', 3, 1, 'NASIONAL', 'RESMI', 'Peringatan berdirinya Departemen/Kementerian Agama Republik Indonesia.'),
('Hari Braille Sedunia', 4, 1, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan hak aksesibilitas dan kesadaran pentingnya huruf Braille.'),
('Hari Korps Wanita Angkatan Laut (KOWAL)', 5, 1, 'HUT_INSTANSI', 'HUT', 'HUT Korps Wanita TNI Angkatan Laut.'),
('Hari Gerakan Satu Juta Pohon', 10, 1, 'LINGKUNGAN', 'RESMI', 'Gerakan nasional pelestarian pohon dan penghijauan lingkungan.'),
('Hari K3 Nasional (Bulan K3)', 12, 1, 'PROFESI', 'RESMI', 'Pencanangan Bulan Keselamatan dan Kesehatan Kerja Nasional.'),
('Hari Dharma Samudera', 15, 1, 'HUT_INSTANSI', 'RESMI', 'Peringatan pertempuran Laut Arafuru dan kepahlawanan Komodor Yos Sudarso.'),
('Hari Pendidikan Internasional', 24, 1, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan peran penting pendidikan bagi perdamaian dan pembangunan global.'),
('Hari Gizi Nasional', 25, 1, 'KESEHATAN', 'RESMI', 'Peringatan komitmen peningkatan gizi masyarakat Indonesia.'),
('Hari Kepabeanan Internasional', 26, 1, 'PROFESI', 'INTERNASIONAL', 'Peringatan peran institusi bea dan cukai internasional.'),
('Hari Energi Bersih Internasional', 26, 1, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan transisi menuju energi bersih dan energi baru terbarukan (EBT).'),
('HUT Nahdlatul Ulama (NU)', 31, 1, 'NASIONAL', 'HUT', 'Peringatan hari lahir organisasi Nahdlatul Ulama.'),

-- FEBRUARI
('Hari Lahan Basah Sedunia', 2, 2, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan pelestarian ekosistem lahan basah dunia.'),
('Hari Kanker Sedunia', 4, 2, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan kesadaran pencegahan dan penanganan penyakit kanker.'),
('HUT Himpunan Mahasiswa Islam (HMI)', 5, 2, 'NASIONAL', 'HUT', 'HUT berdirinya organisasi kepemudaan HMI.'),
('Hari Pers Nasional (HPN)', 9, 2, 'PROFESI', 'RESMI', 'Peringatan Hari Pers Nasional dan HUT Persatuan Wartawan Indonesia (PWI).'),
('Hari Perempuan dan Anak Perempuan dalam Sains', 11, 2, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan kesetaraan peran perempuan dalam bidang sains dan teknologi.'),
('Hari Radio Sedunia', 13, 2, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan peran radio sebagai media informasi dan komunikasi publik.'),
('Hari Peringatan Pembela Tanah Air (PETA)', 14, 2, 'NASIONAL', 'RESMI', 'Peringatan peristiwa perjuangan pahlawan PETA Blitar.'),
('Hari Keadilan Sosial Sedunia', 20, 2, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan pemajuan keadilan sosial, kesetaraan hak, dan pengentasan kemiskinan.'),
('Hari Bahasa Ibu Internasional', 21, 2, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan pelestarian bahasa daerah dan bahasa ibu di seluruh dunia.'),
('HUT Jasa Raharja', 22, 2, 'HUT_INSTANSI', 'HUT', 'HUT PT Jasa Raharja (Persero).'),

-- MARET
('Hari Kehakiman Nasional', 1, 3, 'HUT_INSTANSI', 'RESMI', 'Peringatan integritas lembaga kehakiman dan pengadilan di Indonesia.'),
('Hari Satwa Liar Sedunia', 3, 3, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan perlindungan satwa dan tumbuhan liar dunia.'),
('Hari Kostrad TNI AD', 6, 3, 'HUT_INSTANSI', 'HUT', 'HUT Komando Cadangan Strategis Angkatan Darat.'),
('Hari Perempuan Internasional', 8, 3, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan hak perempuan dan kesetaraan gender dunia.'),
('Hari Musik Nasional', 9, 3, 'NASIONAL', 'RESMI', 'Peringatan karya musik nasional bertepatan lahirnya Wage Rudolf Soepratman.'),
('Hari Matematika Internasional', 14, 3, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan ilmu matematika (Pi Day) bagi kemajuan sains dan teknologi.'),
('Hari Hak Konsumen Sedunia', 15, 3, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan perlindungan hak konsumen dan peningkatan standar pelayanan.'),
('Hari Kebahagiaan Internasional', 20, 3, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan pentingnya kebahagiaan dan kesejahteraan masyarakat global.'),
('Hari Hutan Internasional', 21, 3, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan pelestarian kawasan hutan dunia.'),
('Hari Air Sedunia (World Water Day)', 22, 3, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan konservasi dan pengelolaan sumber daya air bersih.'),
('Hari Meteorologi Sedunia', 23, 3, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan peran meteorologi, klimatologi, dan geofisika.'),
('Hari Peringatan Bandung Lautan Api', 24, 3, 'NASIONAL', 'RESMI', 'Peringatan peristiwa sejarah patriotisme Bandung Lautan Api 1946.'),
('Hari Film Nasional', 30, 3, 'NASIONAL', 'RESMI', 'Peringatan apresiasi karya industri perfilman Indonesia.'),

-- APRIL
('Hari Nelayan Nasional', 6, 4, 'PROFESI', 'RESMI', 'Apresiasi kepada nelayan dan sektor kemaritiman Indonesia.'),
('Hari Kesehatan Sedunia', 7, 4, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan berdirinya WHO dan promosi kesehatan global.'),
('HUT TNI Angkatan Udara (TNI AU)', 9, 4, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Tentara Nasional Indonesia Angkatan Udara.'),
('Hari Kartini', 21, 4, 'NASIONAL', 'RESMI', 'Peringatan perjuangan emansipasi perempuan oleh R.A. Kartini.'),
('Hari Bumi (Earth Day)', 22, 4, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan kepedulian lingkungan hidup dan kelestarian bumi.'),
('Hari Buku Sedunia (World Book Day)', 23, 4, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan literasi, penerbitan buku, dan hak cipta karya tulis.'),
('Hari Angkutan Nasional', 24, 4, 'PROFESI', 'RESMI', 'Peringatan pemajuan transportasi dan angkutan umum nasional.'),
('Hari Malaria Sedunia', 25, 4, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan eliminasi dan pengendalian penyakit malaria.'),
('Hari Kekayaan Intelektual Sedunia', 26, 4, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan inovasi, paten, merek, dan hak cipta.'),
('Hari Bhakti Pemasyarakatan', 27, 4, 'HUT_INSTANSI', 'RESMI', 'Peringatan sistem pemasyarakatan Kementerian Hukum dan HAM.'),
('Hari K3 Sedunia (World OSH Day)', 28, 4, 'PROFESI', 'INTERNASIONAL', 'Peringatan keselamatan dan kesehatan kerja internasional.'),

-- MEI
('Hari Buruh Internasional (May Day)', 1, 5, 'NASIONAL', 'LIBUR_NASIONAL', 'Peringatan hak-hak tenaga kerja dan kesejahteraan buruh sedunia.'),
('Hari Pendidikan Nasional (Hardiknas)', 2, 5, 'NASIONAL', 'RESMI', 'Peringatan hari kelahiran Ki Hajar Dewantara dan pemajuan pendidikan nasional.'),
('Hari Kebebasan Pers Sedunia', 3, 5, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan prinsip kebebasan dan independensi pers internasional.'),
('Hari Buku Nasional', 17, 5, 'NASIONAL', 'RESMI', 'Peringatan hari berdirinya Perpustakaan Nasional RI dan gemar membaca.'),
('Hari Telekomunikasi & Masyarakat Informasi Sedunia', 17, 5, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan peran TIK dan konektivitas digital bagi masyarakat.'),
('Hari Kearsipan Nasional', 18, 5, 'NASIONAL', 'RESMI', 'Peringatan tata kelola kearsipan dan dokumentasi sejarah bangsa.'),
('Hari Kebangkitan Nasional (Harkitnas)', 20, 5, 'NASIONAL', 'RESMI', 'Peringatan berdirinya Boedi Oetomo 1908 dan kebangkitan bangsa Indonesia.'),
('Hari Reformasi Nasional', 21, 5, 'NASIONAL', 'RESMI', 'Peringatan bergulirnya era reformasi dan demokrasi di Indonesia.'),
('Hari Keanekaragaman Hayati Sedunia', 22, 5, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan konservasi keanekaragaman flora dan fauna dunia.'),
('Hari Lanjut Usia Nasional', 29, 5, 'NASIONAL', 'RESMI', 'Apresiasi dan penghormatan bagi para lansia di Indonesia.'),
('Hari Tanpa Tembakau Sedunia', 31, 5, 'KESEHATAN', 'INTERNASIONAL', 'Kampanye hidup sehat bebas asap rokok.'),

-- JUNI
('Hari Lahir Pancasila', 1, 6, 'NASIONAL', 'LIBUR_NASIONAL', 'Peringatan lahirnya falsafah dasar negara Pancasila.'),
('Hari Lingkungan Hidup Sedunia', 5, 6, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan aksi nyata pelestarian alam dan lingkungan hidup.'),
('Hari Laut Sedunia (World Ocean Day)', 8, 6, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan kelestarian ekosistem kelautan dan samudra.'),
('Hari Donor Darah Sedunia', 14, 6, 'KESEHATAN', 'INTERNASIONAL', 'Apresiasi bagi para pendonor darah sukarela sedunia.'),
('Hari Penanggulangan Degradasi Lahan Sedunia', 17, 6, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan pencegahan kekeringan dan degradasi tanah.'),
('Hari Krida Pertanian', 21, 6, 'PROFESI', 'RESMI', 'Apresiasi bagi petani, peternak, dan penggerak pangan nasional.'),
('Hari Bidan Nasional', 24, 6, 'PROFESI', 'RESMI', 'Peringatan peran bidan dalam kesehatan ibu dan anak di Indonesia.'),
('Hari Anti Narkotika Internasional (HANI)', 26, 6, 'NASIONAL', 'INTERNASIONAL', 'Peringatan perang terhadap penyalahgunaan narkotika.'),
('Hari Keluarga Nasional (Harganas)', 29, 6, 'NASIONAL', 'RESMI', 'Peringatan penguatan ketahanan dan keharmonisan keluarga.'),
('Hari Media Sosial', 30, 6, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan etika dan pemanfaatan positif media sosial.'),

-- JULI
('Hari Bhayangkara (HUT Polri)', 1, 7, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Kepolisian Negara Republik Indonesia (Polri).'),
('Hari Bank Indonesia', 5, 7, 'HUT_INSTANSI', 'RESMI', 'Peringatan berdirinya Bank Sentral Republik Indonesia.'),
('Hari Koperasi Indonesia', 12, 7, 'NASIONAL', 'RESMI', 'Peringatan kongres koperasi pertama dan pemajuan ekonomi kerakyatan.'),
('Hari Pajak Nasional', 14, 7, 'NASIONAL', 'RESMI', 'Peringatan peran penerimaan pajak bagi pembangunan nasional.'),
('Hari Bhakti Adhyaksa (HUT Kejaksaan RI)', 22, 7, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Kejaksaan Republik Indonesia dan penegakan hukum yang berkeadilan.'),
('Hari Anak Nasional', 23, 7, 'NASIONAL', 'RESMI', 'Peringatan perlindungan hak-hak dan tumbuh kembang anak Indonesia.'),
('Hari Mangrove Sedunia', 26, 7, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan konservasi ekosistem hutan bakau/mangrove.'),
('Hari Bhakti TNI Angkatan Udara', 29, 7, 'HUT_INSTANSI', 'RESMI', 'Peringatan operasi udara pertama dan gugurnya pahlawan TNI AU.'),
('Hari Persahabatan Internasional', 30, 7, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan toleransi dan persahabatan antar bangsa.'),

-- AGUSTUS
('HUT ASEAN', 8, 8, 'INTERNASIONAL', 'HUT', 'Peringatan berdirinya Perhimpunan Bangsa-Bangsa Asia Tenggara (ASEAN).'),
('Hari Veteran Nasional', 10, 8, 'NASIONAL', 'RESMI', 'Penghormatan kepada pejuang veteran kemerdekaan Republik Indonesia.'),
('Hari Kebangkitan Teknologi Nasional (Hakteknas)', 10, 8, 'NASIONAL', 'RESMI', 'Peringatan terbang perdana pesawat N-250 karya anak bangsa.'),
('Hari Pemuda Internasional', 12, 8, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan peran pemuda sebagai agen perubahan global.'),
('Hari Pramuka', 14, 8, 'NASIONAL', 'HUT', 'Peringatan lahirnya Gerakan Pramuka Praja Muda Karana di Indonesia.'),
('HUT Proklamasi Kemerdekaan RI', 17, 8, 'NASIONAL', 'LIBUR_NASIONAL', 'Dirgahayu Kemerdekaan Republik Indonesia.'),
('HUT Mahkamah Agung RI', 19, 8, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Mahkamah Agung Republik Indonesia.'),
('Hari Televisi Republik Indonesia (TVRI)', 24, 8, 'HUT_INSTANSI', 'HUT', 'HUT berdirinya Lembaga Penyiaran Publik TVRI.'),
('Hari Perumahan Nasional (Hapernas)', 25, 8, 'NASIONAL', 'RESMI', 'Peringatan pemenuhan hak hunian layak bagi masyarakat.'),

-- SEPTEMBER
('Hari Polisi Wanita (Polwan)', 1, 9, 'HUT_INSTANSI', 'RESMI', 'Peringatan berdirinya Polisi Wanita Republik Indonesia.'),
('Hari Pelanggan Nasional (Harpelnas)', 4, 9, 'PROFESI', 'RESMI', 'Apresiasi komitmen pelayanan prima kepada seluruh pelanggan setia.'),
('Hari Aksara Internasional', 8, 9, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan pemberantasan buta aksara dan penguatan literasi.'),
('Hari Olahraga Nasional (Haornas)', 9, 9, 'NASIONAL', 'RESMI', 'Peringatan PON I 1948 dan penggeloraan semangat olahraga nasional.'),
('HUT TNI Angkatan Laut (TNI AL)', 10, 9, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Tentara Nasional Indonesia Angkatan Laut.'),
('Hari Radio Republik Indonesia (RRI)', 11, 9, 'HUT_INSTANSI', 'HUT', 'HUT Radio Republik Indonesia (Sekali di Udara Tetap di Udara).'),
('Hari Kunjung Perpustakaan', 14, 9, 'NASIONAL', 'RESMI', 'Gerakan gemar membaca dan berkunjung ke perpustakaan.'),
('HUT Palang Merah Indonesia (PMI)', 17, 9, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Palang Merah Indonesia dan pengabdian kemanusiaan.'),
('Hari Perhubungan Nasional (Harhubnas)', 17, 9, 'HUT_INSTANSI', 'RESMI', 'Peringatan keselamatan dan konektivitas transportasi nasional oleh Kemenhub.'),
('Hari Perdamaian Internasional', 21, 9, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan penghentian kekerasan dan gencatan senjata global.'),
('Hari Maritim Nasional', 23, 9, 'NASIONAL', 'RESMI', 'Peringatan kedaulatan kemaritiman dan potensi kelautan Indonesia.'),
('Hari Tani Nasional (HTN)', 24, 9, 'PROFESI', 'RESMI', 'Peringatan UU Pokok Agraria 1960 dan apresiasi petani Indonesia.'),
('Hari Statistik Nasional (HSN)', 26, 9, 'HUT_INSTANSI', 'RESMI', 'Peringatan UU Statistik dan peran data statistik bagi pembangunan.'),
('Hari Bhakti Postel', 27, 9, 'HUT_INSTANSI', 'RESMI', 'Peringatan pengambilalihan Jawatan Pos, Telegraf, dan Telepon 1945.'),
('HUT Kereta Api Indonesia (KAI)', 28, 9, 'HUT_INSTANSI', 'HUT', 'Dirgahayu PT Kereta Api Indonesia (Persero).'),
('Hari Jantung Sedunia', 29, 9, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan pencegahan penyakit kardiovaskular dan jantung.'),
('Hari Peringatan G30S/PKI', 30, 9, 'NASIONAL', 'RESMI', 'Pengibaran bendera setengah tiang mengenang Pahlawan Revolusi.'),

-- OKTOBER
('Hari Kesaktian Pancasila', 1, 10, 'NASIONAL', 'RESMI', 'Peringatan keteguhan dan kesaktian ideologi dasar negara Pancasila.'),
('Hari Batik Nasional', 2, 10, 'NASIONAL', 'RESMI', 'Peringatan penetapan Batik Indonesia sebagai Warisan Budaya UNESCO.'),
('HUT Tentara Nasional Indonesia (TNI)', 5, 10, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Tentara Nasional Indonesia (TNI Patriot NKRI).'),
('Hari Guru Sedunia', 5, 10, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan apresiasi profesi pendidik dan guru sedunia.'),
('Hari Kesehatan Jiwa Sedunia', 10, 10, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan kesadaran kesehatan mental di tempat kerja dan masyarakat.'),
('Hari Cuci Tangan Pakai Sabun Sedunia', 15, 10, 'KESEHATAN', 'INTERNASIONAL', 'Kampanye perilaku hidup bersih dan sehat.'),
('Hari Pangan Sedunia (World Food Day)', 16, 10, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan ketahanan pangan dan pengentasan kelaparan.'),
('Hari Santri Nasional', 22, 10, 'NASIONAL', 'RESMI', 'Peringatan Resolusi Jihad 1945 dan peran santri bagi kemerdekaan.'),
('Hari Perserikatan Bangsa-Bangsa (PBB)', 24, 10, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan berlakunya Piagam PBB tahun 1945.'),
('Hari Dokter Nasional', 24, 10, 'PROFESI', 'RESMI', 'HUT Ikatan Dokter Indonesia (IDI) dan apresiasi pengabdian dokter.'),
('Hari Listrik Nasional (HLN)', 27, 10, 'HUT_INSTANSI', 'HUT', 'Peringatan Hari Listrik Nasional ke-81 dan dedikasi PT PLN (Persero) menerangi negeri.'),
('Hari Sumpah Pemuda', 28, 10, 'NASIONAL', 'RESMI', 'Peringatan ikrar persatuan pemuda Indonesia 28 Oktober 1928.'),
('Hari Bahasa Indonesia', 28, 10, 'NASIONAL', 'RESMI', 'Bulan Bahasa dan penghormatan bahasa persatuan Bahasa Indonesia.'),
('Hari Stroke Sedunia', 29, 10, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan kesadaran gejala dan pencegahan serangan stroke.'),

-- NOVEMBER
('Hari Cinta Puspa dan Satwa Nasional', 5, 11, 'LINGKUNGAN', 'RESMI', 'Peringatan kepedulian flora dan fauna endemik Indonesia.'),
('Hari Pahlawan', 10, 11, 'NASIONAL', 'RESMI', 'Peringatan pertempuran Surabaya 10 November 1945 dan teladan pahlawan.'),
('Hari Kesehatan Nasional (HKN)', 12, 11, 'KESEHATAN', 'RESMI', 'Peringatan pembasmian malaria 1959 dan kemandirian kesehatan nasional.'),
('Hari Diabetes Sedunia', 14, 11, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan edukasi dan pencegahan penyakit diabetes melitus.'),
('Hari Toleransi Internasional', 16, 11, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan penguatan kerukunan dan saling menghormati keberagaman.'),
('Hari Anak Sedunia (World Children Day)', 20, 11, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan deklarasi hak-hak asasi anak sedunia.'),
('Hari Pohon Sedunia', 21, 11, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan pentingnya pohon bagi paru-paru bumi.'),
('Hari Guru Nasional & HUT PGRI', 25, 11, 'PROFESI', 'RESMI', 'Dirgahayu Persatuan Guru Republik Indonesia dan apresiasi pahlawan tanpa tanda jasa.'),
('Hari Menanam Pohon Indonesia (HMPI)', 28, 11, 'LINGKUNGAN', 'RESMI', 'Gerakan nasional penanaman pohon serentak di Indonesia.'),
('HUT KORPRI', 29, 11, 'HUT_INSTANSI', 'HUT', 'Dirgahayu Korps Pegawai Republik Indonesia dan netralitas ASN.'),
('Hari Keamanan Komputer (Cyber Security Day)', 30, 11, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan perlindungan data dan keamanan siber.'),

-- DESEMBER
('Hari AIDS Sedunia', 1, 12, 'KESEHATAN', 'INTERNASIONAL', 'Peringatan solidaritas dan edukasi pencegahan HIV/AIDS.'),
('Hari Bakti Pekerjaan Umum (Hari Bakti PU)', 3, 12, 'HUT_INSTANSI', 'RESMI', 'Peringatan perjuangan sapta bakti insan Pekerjaan Umum di Gedung Sate 1945.'),
('Hari Disabilitas Internasional', 3, 12, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan inklusivitas dan pemenuhan hak penyandang disabilitas.'),
('Hari Relawan Internasional', 5, 12, 'INTERNASIONAL', 'INTERNASIONAL', 'Apresiasi bagi para relawan sosial kemanusiaan dunia.'),
('Hari Penerbangan Sipil Internasional', 7, 12, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan keselamatan navigasi dan penerbangan sipil.'),
('Hari Anti-Korupsi Sedunia (Hakordia)', 9, 12, 'NASIONAL', 'INTERNASIONAL', 'Peringatan komitmen integritas dan pemberantasan korupsi.'),
('Hari Hak Asasi Manusia (HAM)', 10, 12, 'INTERNASIONAL', 'INTERNASIONAL', 'Peringatan Deklarasi Universal Hak Asasi Manusia 1948.'),
('Hari Gunung Internasional', 11, 12, 'LINGKUNGAN', 'INTERNASIONAL', 'Peringatan konservasi ekosistem pegunungan dunia.'),
('Hari Nusantara', 13, 12, 'NASIONAL', 'RESMI', 'Peringatan Deklarasi Djuanda 1957 tentang kesatuan wilayah kepulauan RI.'),
('Hari Juang TNI AD', 15, 12, 'HUT_INSTANSI', 'RESMI', 'Peringatan Palagan Ambarawa dan kemanunggalan TNI Angkatan Darat dengan rakyat.'),
('Hari Bela Negara', 19, 12, 'NASIONAL', 'RESMI', 'Peringatan berdirinya Pemerintah Darurat RI (PDRI) 1948 di Bukittinggi.'),
('Hari Kesetiakawanan Sosial Nasional (HKSN)', 20, 12, 'NASIONAL', 'RESMI', 'Peringatan gotong royong dan kepedulian sosial masyarakat.'),
('Hari Ibu', 22, 12, 'NASIONAL', 'RESMI', 'Peringatan Kongres Perempuan Indonesia I 1928 dan apresiasi kaum ibu.'),
('Hari Natal', 25, 12, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Hari Raya Natal bagi umat Kristiani.')
ON CONFLICT DO NOTHING;

-- Hari Libur / Hari Raya Keagamaan Dinamis (2025 - 2028)
INSERT INTO important_events (name, day, month, year, category, status, description) VALUES
-- 2025
('Tahun Baru Imlek 2576 Kongzili', 29, 1, 2025, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Tahun Baru Imlek 2576.'),
('Isra Mikraj Nabi Muhammad SAW', 27, 1, 2025, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan perjalanan suci Isra Mikraj.'),
('Hari Suci Nyepi (Tahun Baru Saka 1947)', 29, 3, 2025, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Suci Nyepi Tahun Baru Saka 1947.'),
('Hari Raya Idul Fitri 1446 H', 31, 3, 2025, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Idul Fitri 1 Syawal 1446 H.'),
('Hari Raya Idul Fitri 1446 H (Hari Kedua)', 1, 4, 2025, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Idul Fitri 1446 H hari kedua.'),
('Wafat Yesus Kristus', 18, 4, 2025, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Wafat Yesus Kristus (Jumat Agung).'),
('Hari Raya Waisak 2569 BE', 12, 5, 2025, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Waisak 2569 Buddhist Era.'),
('Kenaikan Yesus Kristus', 29, 5, 2025, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Kenaikan Yesus Kristus.'),
('Hari Raya Idul Adha 1446 H', 6, 6, 2025, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Idul Adha 10 Dzulhijjah 1446 H.'),
('Tahun Baru Islam 1447 H', 26, 6, 2025, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Tahun Baru Islam 1 Muharram 1447 H.'),
('Maulid Nabi Muhammad SAW', 5, 9, 2025, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Kelahiran Nabi Muhammad SAW.'),

-- 2026
('Isra Mikraj Nabi Muhammad SAW', 16, 1, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan perjalanan suci Isra Mikraj 1447 H.'),
('Tahun Baru Imlek 2577 Kongzili', 17, 2, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Tahun Baru Imlek 2577 Shio Kuda.'),
('Hari Suci Nyepi (Tahun Baru Saka 1948)', 19, 3, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Suci Nyepi Tahun Baru Saka 1948.'),
('Hari Raya Idul Fitri 1447 H', 20, 3, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Idul Fitri 1 Syawal 1447 H.'),
('Hari Raya Idul Fitri 1447 H (Hari Kedua)', 21, 3, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Idul Fitri 1447 H hari kedua.'),
('Wafat Yesus Kristus', 3, 4, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Wafat Yesus Kristus (Jumat Agung).'),
('Kenaikan Yesus Kristus', 14, 5, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Kenaikan Yesus Kristus.'),
('Hari Raya Idul Adha 1447 H', 27, 5, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Idul Adha 10 Dzulhijjah 1447 H.'),
('Hari Raya Waisak 2570 BE', 31, 5, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Waisak 2570 Buddhist Era.'),
('Tahun Baru Islam 1448 H', 16, 6, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Tahun Baru Islam 1 Muharram 1448 H.'),
('Maulid Nabi Muhammad SAW', 25, 8, 2026, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Kelahiran Nabi Muhammad SAW 12 Rabiul Awwal 1448 H.'),

-- 2027
('Isra Mikraj Nabi Muhammad SAW', 5, 1, 2027, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan perjalanan suci Isra Mikraj.'),
('Tahun Baru Imlek 2578 Kongzili', 6, 2, 2027, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Tahun Baru Imlek 2578.'),
('Hari Raya Idul Fitri 1448 H', 10, 3, 2027, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Idul Fitri 1 Syawal 1448 H.'),
('Hari Suci Nyepi (Tahun Baru Saka 1949)', 9, 3, 2027, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Suci Nyepi Tahun Baru Saka 1949.'),
('Wafat Yesus Kristus', 26, 3, 2027, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Wafat Yesus Kristus (Jumat Agung).'),
('Kenaikan Yesus Kristus', 6, 5, 2027, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Kenaikan Yesus Kristus.'),
('Hari Raya Idul Adha 1448 H', 16, 5, 2027, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Idul Adha 1448 H.'),
('Hari Raya Waisak 2571 BE', 20, 5, 2027, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Hari Raya Waisak 2571 BE.'),
('Tahun Baru Islam 1449 H', 6, 6, 2027, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Tahun Baru Islam 1 Muharram 1449 H.'),
('Maulid Nabi Muhammad SAW', 15, 8, 2027, 'KEAGAMAAN', 'LIBUR_NASIONAL', 'Peringatan Kelahiran Nabi Muhammad SAW.')
ON CONFLICT DO NOTHING;
