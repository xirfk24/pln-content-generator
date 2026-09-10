package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type importRow struct {
	Title           string `json:"title"`
	Topic           string `json:"topic"`
	PlannedDate     string `json:"planned_date"`
	Platform        string `json:"platform"`
	Format          string `json:"format"`
	Category        string `json:"category"`
	Tema            string `json:"tema"`
	ContentPurpose  string `json:"content_purpose"`
	PostingCategory string `json:"posting_category"`
	PIC             string `json:"pic"`
	Brief           string `json:"brief"`
	Reference       string `json:"reference"`
}

type importInput struct {
	Rows []importRow `json:"rows"`
}

type importError struct {
	Row     int    `json:"row"`
	Field   string `json:"field"`
	Message string `json:"message"`
}

// POST /api/contents/import
func (h *Handler) ImportContents(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	var in importInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if len(in.Rows) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak ada baris yang diimpor"})
		return
	}
	if len(in.Rows) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Terlalu banyak baris (maks. 500 per import)"})
		return
	}

	// Load master data for name→ID resolution (case-insensitive)
	platformMap := h.loadNameMap("platforms")
	categoryMap := h.loadNameMap("categories")
	pillarMap := h.loadNameMap("pillars")

	validFormats := map[string]bool{
		"Vid/Reels/Shorts": true, "Feed/Photo": true, "Carousel": true,
		"Story": true, "Article": true, "Infographic": true,
	}
	validPurposes := map[string]bool{
		"EDUCATION": true, "ENTERTAINMENT": true, "INSPIRATIONAL": true,
		"PROMOTION": true, "INFORMATION": true,
	}
	validPostingCats := map[string]bool{
		"ORIGINAL": true, "REPOST_PLN_ID": true, "REPOST_UP3": true,
		"CAMPAIGN": true, "OTHER": true,
	}

	imported := 0
	skipped := 0
	errs := []importError{}

	for i, row := range in.Rows {
		rowNum := i + 2 // row 1 = header

		title := strings.TrimSpace(row.Title)
		topic := strings.TrimSpace(row.Topic)

		if title == "" {
			errs = append(errs, importError{Row: rowNum, Field: "title", Message: "Title wajib diisi"})
			continue
		}
		if topic == "" {
			errs = append(errs, importError{Row: rowNum, Field: "topic", Message: "Topic wajib diisi"})
			continue
		}

		// Format — default to Carousel if empty
		format := strings.TrimSpace(row.Format)
		if format == "" {
			format = "Carousel"
		} else if !validFormats[format] {
			errs = append(errs, importError{Row: rowNum, Field: "format",
				Message: fmt.Sprintf("Format '%s' tidak valid. Gunakan: Vid/Reels/Shorts, Feed/Photo, Carousel, Story, Article, Infographic", format)})
			continue
		}

		// ContentPurpose — optional, but must be valid if provided
		contentPurpose := strings.ToUpper(strings.TrimSpace(row.ContentPurpose))
		if contentPurpose != "" && !validPurposes[contentPurpose] {
			errs = append(errs, importError{Row: rowNum, Field: "content_purpose",
				Message: fmt.Sprintf("Content Purpose '%s' tidak valid. Gunakan: EDUCATION, ENTERTAINMENT, INSPIRATIONAL, PROMOTION, INFORMATION", row.ContentPurpose)})
			continue
		}

		// PostingCategory — optional, but must be valid if provided
		postingCategory := strings.ToUpper(strings.TrimSpace(row.PostingCategory))
		if postingCategory != "" && !validPostingCats[postingCategory] {
			errs = append(errs, importError{Row: rowNum, Field: "posting_category",
				Message: fmt.Sprintf("Posting Category '%s' tidak valid. Gunakan: ORIGINAL, REPOST_PLN_ID, REPOST_UP3, CAMPAIGN, OTHER", row.PostingCategory)})
			continue
		}

		// Resolve platform name → ID
		var platformID *string
		if p := strings.TrimSpace(row.Platform); p != "" {
			id, ok := platformMap[strings.ToLower(p)]
			if !ok {
				errs = append(errs, importError{Row: rowNum, Field: "platform",
					Message: fmt.Sprintf("Platform '%s' tidak ditemukan di sistem", p)})
				continue
			}
			platformID = &id
		}

		// Resolve category name → ID
		var categoryID *string
		if cat := strings.TrimSpace(row.Category); cat != "" {
			id, ok := categoryMap[strings.ToLower(cat)]
			if !ok {
				errs = append(errs, importError{Row: rowNum, Field: "category",
					Message: fmt.Sprintf("Category '%s' tidak ditemukan di sistem", cat)})
				continue
			}
			categoryID = &id
		}

		// Resolve tema (pillar) name → ID
		var pillarID *string
		if t := strings.TrimSpace(row.Tema); t != "" {
			id, ok := pillarMap[strings.ToLower(t)]
			if !ok {
				errs = append(errs, importError{Row: rowNum, Field: "tema",
					Message: fmt.Sprintf("Tema '%s' tidak ditemukan di sistem", t)})
				continue
			}
			pillarID = &id
		}

		// Parse and validate planned_date
		var plannedDate *string
		var plannedWeek *int
		var dayStr *string
		if d := strings.TrimSpace(row.PlannedDate); d != "" {
			t, ok := parseDateStr(d)
			if !ok {
				errs = append(errs, importError{Row: rowNum, Field: "planned_date",
					Message: fmt.Sprintf("Format tanggal '%s' tidak valid — gunakan YYYY-MM-DD", d)})
				continue
			}
			formatted := t.Format("2006-01-02")
			plannedDate = &formatted
			w := weekNumber(t)
			plannedWeek = &w
			if dn, ok2 := dayName(d); ok2 {
				dayStr = &dn
			}
		}

		// Duplicate check: same title + planned_date
		if plannedDate != nil {
			var count int
			_ = h.Pool.QueryRow(c.Request.Context(),
				"SELECT COUNT(*) FROM contents WHERE LOWER(title) = LOWER($1) AND planned_date = $2",
				title, *plannedDate).Scan(&count)
			if count > 0 {
				skipped++
				errs = append(errs, importError{Row: rowNum, Field: "title",
					Message: fmt.Sprintf("Duplikat: '%s' pada %s sudah ada, baris dilewati", title, *plannedDate)})
				continue
			}
		}

		// Build nullable pointers for optional fields
		var briefPtr, refPtr, picPtr, cpPtr, pcPtr *string
		if v := strings.TrimSpace(row.Brief); v != "" {
			briefPtr = &v
		}
		if v := strings.TrimSpace(row.Reference); v != "" {
			refPtr = &v
		}
		if v := strings.TrimSpace(row.PIC); v != "" {
			picPtr = &v
		}
		if contentPurpose != "" {
			cpPtr = &contentPurpose
		}
		if postingCategory != "" {
			pcPtr = &postingCategory
		}

		_, err := h.Pool.Exec(c.Request.Context(), `
			INSERT INTO contents (
				title, topic, pillar_id, category_id, platform_id, format,
				brief, content_purpose, posting_category,
				planned_date, planned_week, day,
				reference, pic, created_by, status
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'PLANNED')
		`, title, topic, pillarID, categoryID, platformID, format,
			briefPtr, cpPtr, pcPtr,
			plannedDate, plannedWeek, dayStr,
			refPtr, picPtr, user.ID)
		if err != nil {
			errs = append(errs, importError{Row: rowNum, Field: "general",
				Message: "Gagal menyimpan baris — coba lagi atau periksa data"})
			continue
		}
		imported++
	}

	c.JSON(http.StatusOK, gin.H{
		"imported": imported,
		"skipped":  skipped,
		"errors":   errs,
	})
}

// loadNameMap returns a lowercase-name → id map for a given master table.
func (h *Handler) loadNameMap(table string) map[string]string {
	m := map[string]string{}
	rows, err := h.Pool.Query(h.ctx(), "SELECT id, name FROM "+table)
	if err != nil {
		return m
	}
	defer rows.Close()
	for rows.Next() {
		var id, name string
		if rows.Scan(&id, &name) == nil {
			m[strings.ToLower(name)] = id
		}
	}
	return m
}
