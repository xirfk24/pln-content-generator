-- Seed data for PLN Content Management System
-- Run this after schema.sql

-- Pillars (Content Themes)
INSERT INTO pillars (id, name, description) VALUES
  ('11111111-1111-1111-1111-111111111001', 'Keselamatan Listrik', 'Konten edukasi tentang keselamatan dan keamanan kelistrikan'),
  ('11111111-1111-1111-1111-111111111002', 'Informasi Layanan', 'Informasi layanan publik dan pelayanan pelanggan'),
  ('11111111-1111-1111-1111-111111111003', 'Kegiatan Perusahaan', 'Berita dan kegiatan internal perusahaan'),
  ('11111111-1111-1111-1111-111111111004', 'Hari Besar Nasional', 'Konten peringatan hari-hari besar nasional'),
  ('11111111-1111-1111-1111-111111111005', 'Tips Kelistrikan', 'Tips praktis seputar penggunaan listrik'),
  ('11111111-1111-1111-1111-111111111006', 'Program Sosial', 'Program CSR dan kegiatan sosial perusahaan');

-- Categories
INSERT INTO categories (id, name, description) VALUES
  ('22222222-2222-2222-2222-222222222001', 'Edukasi', 'Konten edukatif dan pembelajaran'),
  ('22222222-2222-2222-2222-222222222002', 'Informasi', 'Informasi resmi dan pengumuman'),
  ('22222222-2222-2222-2222-222222222003', 'Promosi', 'Konten promosi dan marketing'),
  ('22222222-2222-2222-2222-222222222004', 'Entertainment', 'Konten hiburan dan engagement'),
  ('22222222-2222-2222-2222-222222222005', 'Testimonial', 'Testimonial pelanggan dan CSR');

-- Platforms
INSERT INTO platforms (id, name, icon) VALUES
  ('33333333-3333-3333-3333-333333333001', 'Instagram', 'instagram'),
  ('33333333-3333-3333-3333-333333333002', 'TikTok', 'tiktok'),
  ('33333333-3333-3333-3333-333333333003', 'Facebook', 'facebook'),
  ('33333333-3333-3333-3333-333333333004', 'YouTube', 'youtube'),
  ('33333333-3333-3333-3333-333333333005', 'Twitter/X', 'twitter');

-- Demo Users (profiles)
-- Note: Actual auth users need to be created via Supabase Auth
-- These profile entries are for demo/seed purposes
INSERT INTO profiles (id, email, full_name, role, is_active) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'admin@pln.co.id', 'Admin Utama', 'ADMIN', TRUE),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'staff1@pln.co.id', 'Budi Santoso', 'STAFF', TRUE),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'staff2@pln.co.id', 'Siti Rahayu', 'STAFF', TRUE);

-- Content Ideas
INSERT INTO content_ideas (id, title, description, pillar_id, target_audience, source, status, created_by) VALUES
  ('df662860-e58f-4bf5-3efe-27a6a68fa50f', 'Tips Hemat Listrik Bulan Ramadhan', 'Tips menghemat penggunaan listrik selama bulan Ramadhan dengan memanfaatkan peralatan elektronik secara efisien', '11111111-1111-1111-1111-111111111005', 'Masyarakat umum, pengguna PLN', 'Team brainstorming', 'SELECTED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  ('75867887-17aa-4948-de6a-b451c4d7d8b3', 'Prosedur Aman Install AC', 'Panduan keamanan dan prosedur instalasi AC yang benar untuk menghindari risiko korsleting', '11111111-1111-1111-1111-111111111001', 'Konsumen pengguna AC', 'Customer feedback', 'DRAFT', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  ('f20d37a8-8fe9-450e-55f9-8556af56c6fc', 'Hari Listrik Nasional 2024', 'Konten peringatan Hari Listrik Nasional dengan tema inovasi energi terbarukan', '11111111-1111-1111-1111-111111111004', 'Masyarakat luas', 'Calendar event', 'SELECTED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  ('a074624a-5c3d-420c-6ef0-1f6546915850', 'Cara Bayar Listrik Via Mobile Banking', 'Tutorial pembayaran tagihan listrik melalui aplikasi mobile banking', '11111111-1111-1111-1111-111111111002', 'Pengguna smartphone', 'Customer service request', 'DRAFT', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  ('82ef2823-2c0c-4617-21bf-263b70714fe4', 'CSR PLN Peduli Pendidikan', 'Dokumentasi kegiatan CSR PLN dalam bidang pendidikan di daerah terpencil', '11111111-1111-1111-1111-111111111006', 'Masyarakat, stakeholder', 'CSR team', 'SELECTED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2');

-- Contents (Main content records)
INSERT INTO contents (id, title, topic, pillar_id, category_id, platform_id, format, brief, target_audience, planned_date, planned_week, pic, priority, status, created_by) VALUES
  -- Published content
  ('5bd24286-d5ad-44b4-ca7f-b97faf8a0a61', '5 Tips Hemat Listrik Saat Bekerja dari Rumah', 'Tips hemat listrik WFH', '11111111-1111-1111-1111-111111111005', '22222222-2222-2222-2222-222222222001', '33333333-3333-3333-3333-333333333001', 'Carousel', 'Carousel berisi 5 tips praktis menghemat listrik saat WFH: 1) Matikan peralatan tidak terpakai, 2) Manfaatkan pencahayaan alami, 3) Gunakan AC bijak, 4) Charger device tepat waktu, 5) Gunakan power strip', 'Profesional WFH, pekerja remote', '2024-08-05', 32, 'Budi Santoso', 'HIGH', 'PUBLISHED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  ('ae892c8a-c38a-4319-f87f-5427dcfcf974', 'Tutorial Daftar Token Listrik Online', 'Panduan pembelian token', '11111111-1111-1111-1111-111111111002', '22222222-2222-2222-2222-222222222002', '33333333-3333-3333-3333-333333333003', 'Short Video', 'Video tutorial 60 detik cara mendaftar dan membeli token listrik secara online melalui aplikasi PLN Mobile', 'Pengguna token baru', '2024-08-08', 32, 'Siti Rahayu', 'HIGH', 'PUBLISHED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  
  -- Approved content ready to publish
  ('ee40ea9e-62e6-4e12-f3e2-75d50767fa43', 'Hari Kemerdekaan Indonesia - PLN Mendukung Penerangan Nusantara', 'Hari Kemerdekaan RI', '11111111-1111-1111-1111-111111111004', '22222222-2222-2222-2222-222222222004', '33333333-3333-3333-3333-333333333001', 'Image Post', 'Post peringatan Hari Kemerdekaan Indonesia dengan visual PLN memastikan penerangan merata di seluruh nusantara', 'Masyarakat Indonesia', '2024-08-17', 33, 'Budi Santoso', 'HIGH', 'READY_TO_PUBLISH', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  
  -- Approved content
  ('ff70d1db-ad29-44f9-39b0-aedb0ba43d88', 'Infografis: Sebaran PLTS di Indonesia', 'Informasi PLTS', '11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222002', '33333333-3333-3333-3333-333333333004', 'Infographic', 'Infografis menampilkan data sebaran Pembangkit Listrik Tenaga Surya di Indonesia beserta kapasitas dan lokasi', 'Stakeholder, masyarakat umum', '2024-08-20', 34, 'Siti Rahayu', 'MEDIUM', 'APPROVED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  
  -- Pending review
  ('7f29203f-7fe9-4dec-b7d5-c11f56982e8a', 'Tips Menghadapi Musim Hujan - Waspadai Korsleting', 'Tips musim hujan', '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222001', '33333333-3333-3333-3333-333333333002', 'Short Video', 'Video singkat tips mencegah korsleting saat musim hujan: periksa instalasi, hindari stop kontak basah, gunakan MCB', 'Masyarakat daerah hujan', '2024-08-25', 34, 'Budi Santoso', 'HIGH', 'PENDING_REVIEW', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  
  -- In Progress
  ('161e01f6-7d10-467c-4895-24f817bafc8b', 'Behind the Scene: Tim PLN Saat Pemadaman', 'Dokumentasi tim lapangan', '11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222004', '33333333-3333-3333-3333-333333333001', 'Reels', 'Konten BTS menampilkan kerja keras tim lapangan PLN dalam menangani pemadaman dan pemulihanListrik', 'Masyarakat umum', '2024-08-28', 35, 'Siti Rahayu', 'MEDIUM', 'IN_PROGRESS', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  
  -- Draft content
  ('e01e56a7-f1cf-4280-00e5-d77d4edf7121', 'Program PLN Peduli: Renovasi Sekolah di NTT', 'CSR pendidikan', '11111111-1111-1111-1111-111111111006', '22222222-2222-2222-2222-222222222005', '33333333-3333-3333-3333-333333333001', 'Carousel', 'Dokumentasi kegiatan CSR PLN renovasi sekolah di Nusa Tenggara Timur sebagai bentuk kepedulian terhadap pendidikan', 'Masyarakat, stakeholder', '2024-09-02', 36, 'Budi Santoso', 'MEDIUM', 'DRAFT', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  ('1b7b0297-ee9f-47ac-3fed-d8c5802d8036', 'Panduan Aplikasi PLN Mobile Update 2024', 'Tutorial aplikasi', '11111111-1111-1111-1111-111111111002', '22222222-2222-2222-2222-222222222001', '33333333-3333-3333-3333-333333333004', 'Long Video', 'Video tutorial lengkap fitur terbaru PLN Mobile: pembayaran, pengaduan, monitoring pemakaian', 'Pengguna PLN Mobile', '2024-09-05', 36, 'Siti Rahayu', 'HIGH', 'DRAFT', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  
  -- Draft content
  ('fc319a95-297b-4671-7d68-3eefa02c4c2b', 'Hari Sumpah Pemuda - Energi Muda untuk Indonesia', 'Hari Sumpah Pemuda', '11111111-1111-1111-1111-111111111004', '22222222-2222-2222-2222-222222222004', '33333333-3333-3333-3333-333333333003', 'Image Post', 'Post peringatan Hari Sumpah Pemuda dengan tema semangat pemuda dalam pembangunan energi nasional', 'Generasi muda Indonesia', '2024-10-28', 44, 'Budi Santoso', 'LOW', 'DRAFT', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  ('f5ff844e-3417-4e59-cb1a-69dd393e3e83', 'Q&A Session: Konsultasi Listrik Rumah', 'QA session', '11111111-1111-1111-1111-111111111002', '22222222-2222-2222-2222-222222222004', '33333333-3333-3333-3333-333333333001', 'Story', 'Session tanya jawab via Instagram Story tentang konsultasi instalasi listrik rumah', 'Homeowner', '2024-09-10', 37, 'Siti Rahayu', 'MEDIUM', 'DRAFT', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  
  -- Rescheduled content
  ('8a4f0868-0307-4a2e-cda8-2355534f65ec', 'Lets Connect: PLN Job Fair 2024', 'Rekrutmen', '11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222003', '33333333-3333-3333-3333-333333333006', 'Image Post', 'Pengumuman PLN Job Fair 2024 untuk rekrutmen talenta terbaik', 'Job seekers', '2024-09-15', 37, 'Budi Santoso', 'HIGH', 'RESCHEDULED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  
  -- More varied content
  ('c46b311c-a136-4326-7367-c31a9b7fbe91', 'Mitos vs Fakta: Tarif Listrik', 'Edukasi tarif', '11111111-1111-1111-1111-111111111005', '22222222-2222-2222-2222-222222222001', '33333333-3333-3333-3333-333333333002', 'Short Video', 'Video myth-busting tentang mitos dan fakta tarif listrik', 'Masyarakat umum', '2024-08-12', 33, 'Siti Rahayu', 'MEDIUM', 'PUBLISHED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  ('b56907e5-4d88-4ba9-f4ff-3d29e4b237e0', 'Live Streaming: Talkshow Energi Terbarukan', 'Talkshow energi', '11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222002', '33333333-3333-3333-3333-333333333004', 'Long Video', 'Live talkshow membahas masa depan energi terbarukan di Indonesia bersama expert', 'Profesional energi, masyarakat', '2024-08-22', 34, 'Budi Santoso', 'HIGH', 'PUBLISHED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  ('f3d44691-c093-413e-81df-966009add69b', 'Customer Story: Pelanggan Puas PLN Mobile', 'Testimonial', '11111111-1111-1111-1111-111111111002', '22222222-2222-2222-2222-222222222005', '33333333-3333-3333-3333-333333333001', 'Carousel', 'Testimoni pelanggan yang merasa terbantu dengan aplikasi PLN Mobile', 'Pengguna PLN Mobile', '2024-08-15', 33, 'Siti Rahayu', 'LOW', 'PUBLISHED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  
  -- Revision required
  ('c4f6a5c5-3cf3-4611-5ed1-d6ed49538a3c', 'Hari Keselamatan Kerja - PLN Prioritaskan K3', 'Hari Keselamatan Kerja', '11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222002', '33333333-3333-3333-3333-333333333005', 'Thread', 'Thread informasi peringatan Hari Keselamatan dan Kesehatan Kerja', 'Pekerja, profesional', '2024-09-12', 37, 'Budi Santoso', 'MEDIUM', 'REVISION_REQUIRED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  
  -- Not Realized
  ('6ad09f92-2497-477f-0e11-ce5bca43077c', 'Event Launching: Program Hemat Energi', 'Event launching', '11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222003', '33333333-3333-3333-3333-333333333001', 'Reels', 'Launch program hemat energi - DIBATALKAN karena jadwal bentrok', 'Masyarakat', '2024-08-01', 31, 'Siti Rahayu', 'HIGH', 'NOT_REALIZED', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3');

-- Publications (Multi-platform publishing)
INSERT INTO publications (id, content_id, platform_id, planned_publish_date, actual_publish_date, url, status, notes) VALUES
  -- Content 001 publications
  ('53c20201-77cf-41fa-de14-97998d17dbee', '5bd24286-d5ad-44b4-ca7f-b97faf8a0a61', '33333333-3333-3333-3333-333333333001', '2024-08-05', '2024-08-05', 'https://instagram.com/p/example1', 'PUBLISHED', 'Posted at 10:00'),
  ('98d166db-8cd4-495b-1419-7fe01b25a23a', '5bd24286-d5ad-44b4-ca7f-b97faf8a0a61', '33333333-3333-3333-3333-333333333003', '2024-08-05', '2024-08-05', 'https://facebook.com/post/example1', 'PUBLISHED', 'Cross-post'),
  -- Content 002 publications
  ('855ccf21-0b8e-4903-cb87-19c311d0d151', 'ae892c8a-c38a-4319-f87f-5427dcfcf974', '33333333-3333-3333-3333-333333333003', '2024-08-08', '2024-08-08', 'https://facebook.com/video/example2', 'PUBLISHED', 'Good engagement'),
  -- Content 012 publications  
  ('4b8d073a-b050-4550-d6fc-21beb3ee4a6e', 'c46b311c-a136-4326-7367-c31a9b7fbe91', '33333333-3333-3333-3333-333333333002', '2024-08-12', '2024-08-12', 'https://tiktok.com/@pln/video/example12', 'PUBLISHED', 'Trending'),
  -- Content 013 publications
  ('c8b1f71f-2137-4695-fc45-fb53961ab98f', 'b56907e5-4d88-4ba9-f4ff-3d29e4b237e0', '33333333-3333-3333-3333-333333333004', '2024-08-22', '2024-08-22', 'https://youtube.com/live/example13', 'PUBLISHED', 'Live stream recording available'),
  -- Content 014 publications
  ('ef0e0ebc-9ed7-4196-cc99-7e0796bc252e', 'f3d44691-c093-413e-81df-966009add69b', '33333333-3333-3333-3333-333333333001', '2024-08-15', '2024-08-15', 'https://instagram.com/p/example14', 'PUBLISHED', 'Positive feedback'),
  -- Planned publications for approved content
  ('021b83f8-b824-425f-53c5-603fb3597d58', 'ee40ea9e-62e6-4e12-f3e2-75d50767fa43', '33333333-3333-3333-3333-333333333001', '2024-08-17', NULL, NULL, 'PLANNED', 'Ready for Aug 17'),
  -- Planned for content 004
  ('0121152c-61bd-4e64-bd69-2500208dc4d0', 'ff70d1db-ad29-44f9-39b0-aedb0ba43d88', '33333333-3333-3333-3333-333333333004', '2024-08-20', NULL, NULL, 'PLANNED', 'Awaiting approval'),
  -- Delayed publication
  ('adec1689-e451-4865-f59d-f2fae4a2066a', '8a4f0868-0307-4a2e-cda8-2355534f65ec', '33333333-3333-3333-3333-333333333006', '2024-09-15', NULL, NULL, 'DELAYED', 'Rescheduling');

-- Performance Metrics
INSERT INTO performance_metrics (id, publication_id, views, likes, comments, shares, saves, reach, recorded_at) VALUES
  -- Content 001 Instagram metrics
  ('663dda39-f8f3-4e22-8604-074ce0fa931d', '53c20201-77cf-41fa-de14-97998d17dbee', 15200, 890, 45, 120, 230, 18700, '2024-08-10'),
  -- Content 001 Facebook metrics
  ('98d932b5-460f-43c4-9341-e21c660fb1c9', '98d166db-8cd4-495b-1419-7fe01b25a23a', 8900, 420, 35, 78, 0, 12000, '2024-08-10'),
  -- Content 002 Facebook metrics
  ('70bece8d-4567-4f65-fbf3-78d5a09f75e7', '855ccf21-0b8e-4903-cb87-19c311d0d151', 23400, 1100, 89, 156, 340, 28500, '2024-08-15'),
  -- Content 012 TikTok metrics
  ('3d799dd5-c69b-4094-f87c-b7374229a181', '4b8d073a-b050-4550-d6fc-21beb3ee4a6e', 45000, 3200, 210, 450, 1200, 55000, '2024-08-20'),
  -- Content 013 YouTube metrics
  ('21aef780-c450-4ad4-1702-1f36b52ac5f9', 'c8b1f71f-2137-4695-fc45-fb53961ab98f', 8900, 560, 78, 120, 230, 10500, '2024-08-25'),
  -- Content 014 Instagram metrics  
  ('ff0dafc8-4b2c-4f21-c084-03b519ea88ce', 'ef0e0ebc-9ed7-4196-cc99-7e0796bc252e', 12600, 720, 52, 95, 180, 14800, '2024-08-20');

-- Approval Histories
INSERT INTO approval_histories (id, content_id, action, from_status, to_status, comment, performed_by, performed_at) VALUES
  -- Content 003 approval flow
  ('99899899-99bd-4193-3402-2e3c849ac0b5', 'ee40ea9e-62e6-4e12-f3e2-75d50767fa43', 'SUBMITTED', 'DRAFT', 'PENDING_REVIEW', 'Submitted for review', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2024-08-10 09:00:00'),
  ('1a5370c5-8953-449b-c5e6-8b3823b0f2d6', 'ee40ea9e-62e6-4e12-f3e2-75d50767fa43', 'REVIEW_APPROVED', 'PENDING_REVIEW', 'APPROVED', 'Looks good, approved for next stage', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '2024-08-10 14:30:00'),
  ('ca55965a-b08c-4b3c-22bd-e7844b3b9412', 'ee40ea9e-62e6-4e12-f3e2-75d50767fa43', 'FINAL_APPROVED', 'APPROVED', 'READY_TO_PUBLISH', 'Final approval granted', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5', '2024-08-11 10:00:00'),
  
  -- Content 004 approval flow
  ('d2da53eb-29e8-4e5d-366b-b072c7ec861b', 'ff70d1db-ad29-44f9-39b0-aedb0ba43d88', 'SUBMITTED', 'DRAFT', 'PENDING_REVIEW', 'Ready for review', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', '2024-08-15 11:00:00'),
  ('a81d188d-ce27-4644-bb9c-3e8647dd0cb2', 'ff70d1db-ad29-44f9-39b0-aedb0ba43d88', 'REVIEW_APPROVED', 'PENDING_REVIEW', 'APPROVED', 'Data accurate and well-presented', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '2024-08-16 09:00:00'),
  
  -- Content 005 revision flow
  ('85013b28-c1ce-4886-855f-51b88f23a9c4', '7f29203f-7fe9-4dec-b7d5-c11f56982e8a', 'SUBMITTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'Draft completed, please review', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2024-08-22 15:00:00'),
  ('7a39e665-0df8-4813-31fb-28582c1a2448', '7f29203f-7fe9-4dec-b7d5-c11f56982e8a', 'REVISION_REQUESTED', 'PENDING_REVIEW', 'REVISION_REQUIRED', 'Please add more specific data on electrical safety standards', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '2024-08-23 10:30:00'),
  ('16d0a517-63af-48ec-8663-9e8f2a6a696d', '7f29203f-7fe9-4dec-b7d5-c11f56982e8a', 'RESUBMITTED', 'REVISION_REQUIRED', 'PENDING_REVIEW', 'Updated with safety standards reference', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2024-08-23 16:00:00'),
  
  -- Content 015 revision
  ('cf89fdcd-49ca-422e-a3ab-cfc36dd35ce4', 'c4f6a5c5-3cf3-4611-5ed1-d6ed49538a3c', 'SUBMITTED', 'DRAFT', 'PENDING_REVIEW', 'Initial submission', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', '2024-08-28 09:00:00'),
  ('ea4d0c6b-37c0-4ab5-7687-6057239eea4e', 'c4f6a5c5-3cf3-4611-5ed1-d6ed49538a3c', 'REVISION_REQUESTED', 'PENDING_REVIEW', 'REVISION_REQUIRED', 'Caption too generic, please add specific K3 program context', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', '2024-08-28 14:00:00');

-- AI Requests (Sample log)
INSERT INTO ai_requests (id, request_type, input_data, created_by) VALUES
  ('e52c5c3d-f522-4d9b-ed04-850a3095cc9d', 'IDEA_GENERATION', '{"pillar": "Keselamatan Listrik", "platform": "Instagram", "count": 5}', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'),
  ('8ea15e3b-7a5c-4fa6-fd61-c20326fc708f', 'CONTENT_GENERATION', '{"topic": "Tips hemat listrik", "platform": "Instagram", "format": "Carousel"}', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'),
  ('4d810ca4-f91e-4f76-53b4-73e1bd1fff4a', 'PERFORMANCE_ANALYSIS', '{"dateRange": "2024-08-01 to 2024-08-31"}', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1');

-- AI Outputs (Sample responses)
INSERT INTO ai_outputs (id, request_id, output_data, model_used) VALUES
  ('a8a22651-d726-4b7b-071a-9ca07b0d6d40', 'e52c5c3d-f522-4d9b-ed04-850a3095cc9d', '{"ideas": [{"title": "Check Instalasi Rumah Sebelum Hujan", "description": "Tips mengecek instalasi listrik sebelum musim hujan"}, {"title": "Jangan Sentuh Kabel Terbuka", "description": "Edukasi bahaya menyentuh kabel listrik yang terbuka"}]}', 'MOCK'),
  ('62e2b4cb-6813-4d4f-2c08-99609b499b7d', '8ea15e3b-7a5c-4fa6-fd61-c20326fc708f', '{"title": "5 Langkah Hemat Listrik", "hook": "Tagihan listrik bikin kantong kering?", "brief": "Carousel 5 slide dengan tips hemat listrik", "caption": "Kurangi tagihan listrik dengan 5 langkah sederhana ini!"}', 'MOCK'),
  ('c2059c44-1115-409e-8b7b-7d065b5033fb', '4d810ca4-f91e-4f76-53b4-73e1bd1fff4a', '{"summary": "Engagement meningkat 15% dari bulan sebelumnya", "findings": ["Konten video pendek memiliki engagement lebih tinggi", "Carousel edukasi mendapat saves tertinggi"], "recommendations": ["Perbanyak konten video format pendek", "Buat lebih banyak konten edukasi bermanfaat"]}', 'MOCK');
