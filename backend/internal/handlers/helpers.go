package handlers

import (
	"fmt"
	"strconv"
	"time"
)

var dayNames = []string{"Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"}

var monthLabels = []string{"Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"}

var statusLabels = map[string]string{
	"DRAFT":             "Draft",
	"PLANNED":           "Planned",
	"IN_PROGRESS":       "In Progress",
	"PENDING_REVIEW":    "Pending Review",
	"REVISION_REQUIRED": "Revision Required",
	"APPROVED":          "Approved",
	"READY_TO_PUBLISH":  "Ready to Publish",
	"PUBLISHED":         "Published",
	"RESCHEDULED":       "Rescheduled",
	"NOT_REALIZED":      "Not Realized",
}

// parseDateStr parses "YYYY-MM-DD" or RFC3339, mirroring JS new Date(str).
func parseDateStr(s string) (time.Time, bool) {
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t, true
	}
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, true
	}
	return time.Time{}, false
}

// weekNumber returns the week of the month (1-5) based on the day of the month.
func weekNumber(t time.Time) int {
	return (t.Day()-1)/7 + 1
}

func dayName(s string) (string, bool) {
	t, ok := parseDateStr(s)
	if !ok {
		return "", false
	}
	return dayNames[t.Weekday()], true
}

func calculateEngagementRate(likes, comments, shares, saves, reach int) float64 {
	if reach == 0 {
		return 0
	}
	return float64(likes+comments+shares+saves) / float64(reach) * 100
}

func monthKey(dateStr string) string {
	if len(dateStr) >= 7 {
		return dateStr[:7]
	}
	return dateStr
}

func monthLabel(key string) string {
	// key = "YYYY-MM"
	if len(key) < 7 {
		return key
	}
	year := key[:4]
	m, err := strconv.Atoi(key[5:7])
	if err != nil || m < 1 || m > 12 {
		return key
	}
	return monthLabels[m-1] + " " + year[2:]
}

// --- Period Date Range helpers (Monthly & Semester Recap) ---

// getPeriodDateRange returns (start, end) as ISO date strings (YYYY-MM-DD)
// for the given year, period mode, and period index.
//
// Modes:
//   - "monthly": period = month 1-12. Start = 1st day, End = last day of month.
//   - "semester": period = 1 or 2. S1 = Jan 1 – Jun 30, S2 = Jul 1 – Dec 31.
//
// All dates use ISO calendar (no timezone shift). Uses time.UTC to ensure
// deterministic output regardless of server timezone.
func getPeriodDateRange(year int, mode string, period int) (string, string) {
	switch mode {
	case "semester":
		if period == 1 {
			return fmt.Sprintf("%04d-01-01", year), fmt.Sprintf("%04d-06-30", year)
		}
		// semester 2 (or fallback)
		return fmt.Sprintf("%04d-07-01", year), fmt.Sprintf("%04d-12-31", year)
	default: // "monthly"
		if period < 1 {
			period = 1
		}
		if period > 12 {
			period = 12
		}
		start := time.Date(year, time.Month(period), 1, 0, 0, 0, 0, time.UTC)
		end := start.AddDate(0, 1, -1)
		return start.Format("2006-01-02"), end.Format("2006-01-02")
	}
}

// periodLabel returns a human-readable label for the period.
func periodLabel(year int, mode string, period int) string {
	switch mode {
	case "semester":
		if period == 1 {
			return fmt.Sprintf("Semester 1 %d", year)
		}
		return fmt.Sprintf("Semester 2 %d", year)
	default:
		if period < 1 || period > 12 {
			return fmt.Sprintf("Month %d %d", period, year)
		}
		return monthLabelsFull[period-1] + " " + fmt.Sprintf("%d", year)
	}
}

var monthLabelsFull = []string{
	"Januari", "Februari", "Maret", "April", "Mei", "Juni",
	"Juli", "Agustus", "September", "Oktober", "November", "Desember",
}
