package handlers

import (
	"testing"
)

func TestGetPeriodDateRange_Monthly(t *testing.T) {
	tests := []struct {
		name   string
		year   int
		period int
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
