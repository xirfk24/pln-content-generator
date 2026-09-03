package handlers

import (
	"math"
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

// weekNumber mirrors the JS getWeekNumber implementation exactly.
func weekNumber(t time.Time) int {
	startOfYear := time.Date(t.Year(), 1, 1, 0, 0, 0, 0, time.UTC)
	days := int(math.Floor(t.Sub(startOfYear).Hours() / 24))
	n := days + int(startOfYear.Weekday()) + 1
	return int(math.Ceil(float64(n) / 7))
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
