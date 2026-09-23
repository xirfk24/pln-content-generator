package handlers

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

var dayNames = []string{"Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"}

var monthLabels = []string{"Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"}

var statusLabels = map[string]string{
	"DRAFT":                     "Draft",
	"PENDING_REVIEW":            "Menunggu Persetujuan Konsep",
	"APPROVED":                 "Konsep Disetujui",
	"PRODUCTION":               "Produksi Konten",
	"PENDING_PRODUCTION_REVIEW": "Menunggu Review Produksi",
	"READY_TO_PUBLISH":          "Siap Publikasi",
	"PUBLISHED":                 "Dipublikasikan",
	"REJECTED":                  "Ditolak",
	"RESCHEDULED":               "Dijadwalkan Ulang",
	"NOT_REALIZED":              "Tidak Direalisasikan",
}

// parseDateStr parses flexible date strings: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD, or RFC3339.
func parseDateStr(s string) (time.Time, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, false
	}
	// Remove ISO time part if present (e.g. 2026-07-13T00:00:00)
	if idx := strings.Index(s, "T"); idx != -1 {
		s = s[:idx]
	}

	formats := []string{
		"2006-01-02",
		"02/01/2006",
		"02-01-2006",
		"02.01.2006",
		"2006/01/02",
		"2/1/2006",
		"2-1-2006",
		time.RFC3339,
		"2006-01-02 15:04:05",
	}

	for _, fmtStr := range formats {
		if t, err := time.Parse(fmtStr, s); err == nil {
			return t, true
		}
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

func semesterKey(dateStr string) string {
	if len(dateStr) < 7 {
		return dateStr
	}
	year := dateStr[:4]
	m, err := strconv.Atoi(dateStr[5:7])
	if err != nil {
		return dateStr
	}
	s := "S2"
	if m >= 1 && m <= 6 {
		s = "S1"
	}
	return year + "-" + s
}

func semesterLabel(key string) string {
	if len(key) < 7 {
		return key
	}
	year := key[:4]
	if key[5:7] == "S1" {
		return "Semester 1 " + year
	}
	return "Semester 2 " + year
}

func getPeriodDateRange(year int, mode string, period int) (string, string) {
	switch mode {
	case "semester":
		if period == 1 {
			return fmt.Sprintf("%04d-01-01", year), fmt.Sprintf("%04d-06-30", year)
		}
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
