package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type ImportRowInput struct {
	RowNumber       int      `json:"row_number"`
	Title           string   `json:"title"`
	Topic           string   `json:"topic"`
	PlannedDate     string   `json:"planned_date"`
	Platform        string   `json:"platform"`
	Format          string   `json:"format"`
	Category        string   `json:"category"`
	Pillar          string   `json:"pillar"`
	ContentPurpose  string   `json:"content_purpose"`
	PostingCategory string   `json:"posting_category"`
	PIC             string   `json:"pic"`
	Brief           string   `json:"brief"`
	TargetAudience  string   `json:"target_audience"`
	Reference       string   `json:"reference"`
}

type importError struct {
	Row     int    `json:"row"`
	Field   string `json:"field"`
	Message string `json:"message"`
}

type ValidateImportInput struct {
	Rows []ImportRowInput `json:"rows"`
}

type ParsedRowData struct {
	Title           string   `json:"title"`
	Topic           string   `json:"topic"`
	PlannedDate     string   `json:"planned_date"`
	PlannedWeek     int      `json:"planned_week"`
	Day             string   `json:"day"`
	PillarID        *string  `json:"pillar_id"`
	PillarName      string   `json:"pillar_name"`
	CategoryID      *string  `json:"category_id"`
	PrimaryPlatformID *string `json:"primary_platform_id"`
	PlatformIDs     []string `json:"platform_ids"`
	PlatformNames   []string `json:"platform_names"`
	Format          string   `json:"format"`
	ContentPurpose  *string  `json:"content_purpose"`
	ContentPurposes []string `json:"content_purposes"`
	PostingCategory *string  `json:"posting_category"`
	PIC             *string  `json:"pic"`
	Brief           *string  `json:"brief"`
	TargetAudience  *string  `json:"target_audience"`
	Reference       *string  `json:"reference"`
}

type RowValidationResult struct {
	RowNumber   int            `json:"row_number"`
	Title       string         `json:"title"`
	Topic       string         `json:"topic"`
	PlannedDate string         `json:"planned_date"`
	Pillar      string         `json:"pillar"`
	Platform    string         `json:"platform"`
	Status      string         `json:"status"` // VALID, INVALID, DUPLICATE, WARNING
	Errors      []string       `json:"errors"`
	Warnings    []string       `json:"warnings"`
	ParsedData  *ParsedRowData `json:"parsed_data,omitempty"`
}

type ValidateImportResponse struct {
	Summary struct {
		Total     int `json:"total"`
		Valid     int `json:"valid"`
		Invalid   int `json:"invalid"`
		Duplicate int `json:"duplicate"`
		Warning   int `json:"warning"`
	} `json:"summary"`
	Rows []RowValidationResult `json:"rows"`
}

// POST /api/contents/import/validate
func (h *Handler) ValidateImportContents(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	var in ValidateImportInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid: " + err.Error()})
		return
	}

	if len(in.Rows) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak ada baris data yang dikirim untuk divalidasi"})
		return
	}
	if len(in.Rows) > 500 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maksimal 500 baris data per proses import"})
		return
	}

	// Load master data maps
	platformMap, platformNamesList := h.loadPlatformMap(c.Request.Context())
	categoryMap := h.loadNameMap("categories")
	pillarMap, pillarNamesList := h.loadPillarMap(c.Request.Context())

	validFormats := map[string]bool{
		"Vid/Reels/Shorts": true, "Feed/Photo": true, "Carousel": true,
		"Story": true, "Article": true, "Infographic": true,
	}
	validPurposes := map[string]string{
		"EDUCATION": "EDUCATION", "EDUKASI": "EDUCATION",
		"ENTERTAINMENT": "ENTERTAINMENT", "HIBURAN": "ENTERTAINMENT",
		"INSPIRATIONAL": "INSPIRATIONAL", "INSPIRASI": "INSPIRATIONAL",
		"PROMOTION": "PROMOTION", "PROMOSI": "PROMOTION",
		"INFORMATION": "INFORMATION", "INFORMASI": "INFORMATION",
	}
	validPostingCats := map[string]string{
		"ORIGINAL": "ORIGINAL",
		"REPOST_PLN_ID": "REPOST_PLN_ID", "REPOST PLN ID": "REPOST_PLN_ID",
		"REPOST_UP3": "REPOST_UP3", "REPOST UP3": "REPOST_UP3",
		"CAMPAIGN": "CAMPAIGN", "KAMPANYE": "CAMPAIGN",
		"OTHER": "OTHER", "LAINNYA": "OTHER",
	}

	// Track in-file duplicates
	seenInFile := make(map[string]int)

	var results []RowValidationResult
	summary := struct {
		Total     int `json:"total"`
		Valid     int `json:"valid"`
		Invalid   int `json:"invalid"`
		Duplicate int `json:"duplicate"`
		Warning   int `json:"warning"`
	}{}

	summary.Total = len(in.Rows)

	for i, row := range in.Rows {
		rowNum := row.RowNumber
		if rowNum <= 0 {
			rowNum = i + 2
		}

		res := RowValidationResult{
			RowNumber:   rowNum,
			Title:       strings.TrimSpace(row.Title),
			Topic:       strings.TrimSpace(row.Topic),
			PlannedDate: strings.TrimSpace(row.PlannedDate),
			Pillar:      strings.TrimSpace(row.Pillar),
			Platform:    strings.TrimSpace(row.Platform),
			Errors:      []string{},
			Warnings:    []string{},
			Status:      "VALID",
		}

		// 1. Validasi Judul
		if res.Title == "" {
			res.Errors = append(res.Errors, "Judul Konten wajib diisi.")
		}

		// 2. Validasi Topik
		if res.Topic == "" {
			res.Errors = append(res.Errors, "Topik Konten wajib diisi.")
		}

		// 3. Validasi Tanggal Rencana Publikasi
		var formattedDate string
		var pWeek int
		var pDay string
		if res.PlannedDate == "" {
			res.Errors = append(res.Errors, "Tanggal Rencana Publikasi wajib diisi.")
		} else {
			t, ok := parseDateStr(res.PlannedDate)
			if !ok {
				res.Errors = append(res.Errors, fmt.Sprintf("Format tanggal '%s' tidak valid. Gunakan format YYYY-MM-DD (contoh: 2026-09-15).", res.PlannedDate))
			} else {
				formattedDate = t.Format("2006-01-02")
				pWeek = weekNumber(t)
				if dn, ok2 := dayName(formattedDate); ok2 {
					pDay = dn
				}
			}
		}

		// 4. Validasi Content Pillar
		var pillarID *string
		var matchedPillarName string
		pName := strings.TrimSpace(row.Pillar)
		if pName == "" {
			pName = strings.TrimSpace(row.Category) // Fallback jika kolom tema
		}
		if pName == "" {
			res.Errors = append(res.Errors, fmt.Sprintf("Content Pillar wajib diisi. Pilihan tersedia: %s.", strings.Join(pillarNamesList, ", ")))
		} else {
			id, name, ok := matchPillar(pName, pillarMap)
			if !ok {
				res.Errors = append(res.Errors, fmt.Sprintf("Content Pillar '%s' tidak ditemukan di sistem. Gunakan salah satu dari: %s.", pName, strings.Join(pillarNamesList, ", ")))
			} else {
				pillarID = &id
				matchedPillarName = name
			}
		}

		// 5. Validasi Target Platform (Support multi-platform comma/slash separated)
		var platformIDs []string
		var platformNames []string
		var primaryPlatformID *string
		platInput := strings.TrimSpace(row.Platform)
		if platInput == "" {
			res.Errors = append(res.Errors, fmt.Sprintf("Target Platform wajib diisi. Pilihan tersedia: %s.", strings.Join(platformNamesList, ", ")))
		} else {
			// Split by comma, semicolon, slash, or newline
			rawPlats := splitMulti(platInput)
			for _, pRaw := range rawPlats {
				pClean := strings.TrimSpace(pRaw)
				if pClean == "" {
					continue
				}
				id, name, ok := matchPlatform(pClean, platformMap)
				if !ok {
					res.Errors = append(res.Errors, fmt.Sprintf("Target Platform '%s' tidak ditemukan di sistem. Pilihan tersedia: %s.", pClean, strings.Join(platformNamesList, ", ")))
				} else {
					if !containsStr(platformIDs, id) {
						platformIDs = append(platformIDs, id)
						platformNames = append(platformNames, name)
					}
				}
			}
			if len(platformIDs) > 0 {
				primaryPlatformID = &platformIDs[0]
			}
		}

		// 6. Validasi Format Konten
		format := strings.TrimSpace(row.Format)
		if format == "" {
			format = "Carousel"
			res.Warnings = append(res.Warnings, "Format konten dikosongkan, default ke 'Carousel'.")
		} else if !validFormats[format] {
			// Try case-insensitive lookup
			matchedFmt := ""
			for vf := range validFormats {
				if strings.EqualFold(vf, format) {
					matchedFmt = vf
					break
				}
			}
			if matchedFmt != "" {
				format = matchedFmt
			} else {
				res.Errors = append(res.Errors, fmt.Sprintf("Format konten '%s' tidak valid. Pilihan: Feed/Photo, Carousel, Vid/Reels/Shorts, Story, Article, Infographic.", format))
			}
		}

		// 7. Validasi Content Purpose
		var primaryPurpose *string
		var purposeList []string
		if cp := strings.TrimSpace(row.ContentPurpose); cp != "" {
			canonical, ok := validPurposes[strings.ToUpper(cp)]
			if !ok {
				res.Errors = append(res.Errors, fmt.Sprintf("Content Purpose '%s' tidak valid. Pilihan: EDUCATION, ENTERTAINMENT, INSPIRATIONAL, PROMOTION, INFORMATION.", cp))
			} else {
				primaryPurpose = &canonical
				purposeList = []string{canonical}
			}
		}

		// 8. Validasi Posting Category
		var postCategory *string
		if pc := strings.TrimSpace(row.PostingCategory); pc != "" {
			canonical, ok := validPostingCats[strings.ToUpper(pc)]
			if !ok {
				res.Errors = append(res.Errors, fmt.Sprintf("Posting Category '%s' tidak valid. Pilihan: ORIGINAL, REPOST_PLN_ID, REPOST_UP3, CAMPAIGN, OTHER.", pc))
			} else {
				postCategory = &canonical
			}
		}

		// 9. Resolve Category (Opsional)
		var categoryID *string
		if cat := strings.TrimSpace(row.Category); cat != "" {
			if id, ok := categoryMap[strings.ToLower(cat)]; ok {
				categoryID = &id
			}
		}

		// 10. Validasi Duplikat (File Internal & Database)
		if res.Title != "" && formattedDate != "" {
			dedupKey := fmt.Sprintf("%s|%s", strings.ToLower(res.Title), formattedDate)

			// In-file duplicate
			if firstRow, exists := seenInFile[dedupKey]; exists {
				res.Errors = append(res.Errors, fmt.Sprintf("Duplikat di dalam file: Judul dan Tanggal sama persis dengan baris %d.", firstRow))
				res.Status = "DUPLICATE"
			} else {
				seenInFile[dedupKey] = rowNum

				// Database duplicate check
				var dbCount int
				_ = h.Pool.QueryRow(c.Request.Context(),
					"SELECT COUNT(*) FROM contents WHERE LOWER(title) = LOWER($1) AND planned_date = $2",
					res.Title, formattedDate).Scan(&dbCount)
				if dbCount > 0 {
					res.Errors = append(res.Errors, fmt.Sprintf("Duplikat di database: Konten dengan judul '%s' pada tanggal %s sudah ada.", res.Title, formattedDate))
					res.Status = "DUPLICATE"
				}
			}
		}

		// Tentukan status akhir baris
		if len(res.Errors) > 0 {
			if res.Status != "DUPLICATE" {
				res.Status = "INVALID"
			}
		} else if len(res.Warnings) > 0 {
			res.Status = "WARNING"
		} else {
			res.Status = "VALID"
		}

		// Siapkan parsed data jika valid atau warning
		if res.Status == "VALID" || res.Status == "WARNING" {
			var picPtr, briefPtr, taPtr, refPtr *string
			if v := strings.TrimSpace(row.PIC); v != "" {
				picPtr = &v
			}
			if v := strings.TrimSpace(row.Brief); v != "" {
				briefPtr = &v
			}
			if v := strings.TrimSpace(row.TargetAudience); v != "" {
				taPtr = &v
			}
			if v := strings.TrimSpace(row.Reference); v != "" {
				refPtr = &v
			}

			res.ParsedData = &ParsedRowData{
				Title:             res.Title,
				Topic:             res.Topic,
				PlannedDate:       formattedDate,
				PlannedWeek:       pWeek,
				Day:               pDay,
				PillarID:          pillarID,
				PillarName:        matchedPillarName,
				CategoryID:        categoryID,
				PrimaryPlatformID: primaryPlatformID,
				PlatformIDs:       platformIDs,
				PlatformNames:     platformNames,
				Format:            format,
				ContentPurpose:    primaryPurpose,
				ContentPurposes:   purposeList,
				PostingCategory:   postCategory,
				PIC:               picPtr,
				Brief:             briefPtr,
				TargetAudience:    taPtr,
				Reference:         refPtr,
			}
		}

		// Update summary
		switch res.Status {
		case "VALID":
			summary.Valid++
		case "WARNING":
			summary.Valid++
			summary.Warning++
		case "DUPLICATE":
			summary.Duplicate++
		case "INVALID":
			summary.Invalid++
		}

		results = append(results, res)
	}

	resp := ValidateImportResponse{
		Summary: summary,
		Rows:    results,
	}

	c.JSON(http.StatusOK, resp)
}

type ExecuteImportInput struct {
	Rows []ParsedRowData `json:"rows"`
}

// POST /api/contents/import
func (h *Handler) ImportContents(c *gin.Context) {
	user := requireUser(c)
	if user == nil {
		return
	}

	var in ExecuteImportInput
	if err := c.ShouldBindJSON(&in); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format payload import tidak valid: " + err.Error()})
		return
	}

	if len(in.Rows) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Tidak ada data valid yang dikirim untuk diimport"})
		return
	}

	imported := 0
	skipped := 0
	errs := []importError{}

	for i, row := range in.Rows {
		rowNum := i + 1
		title := strings.TrimSpace(row.Title)
		topic := strings.TrimSpace(row.Topic)

		if title == "" || topic == "" || row.PlannedDate == "" {
			skipped++
			errs = append(errs, importError{Row: rowNum, Field: "general", Message: "Data wajib (Judul/Topik/Tanggal) tidak lengkap"})
			continue
		}

		// Re-check duplicate in DB
		var count int
		_ = h.Pool.QueryRow(c.Request.Context(),
			"SELECT COUNT(*) FROM contents WHERE LOWER(title) = LOWER($1) AND planned_date = $2",
			title, row.PlannedDate).Scan(&count)
		if count > 0 {
			skipped++
			errs = append(errs, importError{Row: rowNum, Field: "title", Message: fmt.Sprintf("Duplikat: '%s' pada %s sudah ada di database", title, row.PlannedDate)})
			continue
		}

		format := row.Format
		if format == "" {
			format = "Carousel"
		}

		var plannedDate *string
		var plannedWeek *int
		var dayStr *string
		if row.PlannedDate != "" {
			if t, ok := parseDateStr(row.PlannedDate); ok {
				formatted := t.Format("2006-01-02")
				plannedDate = &formatted
				w := weekNumber(t)
				plannedWeek = &w
				if dn, ok2 := dayName(formatted); ok2 {
					dayStr = &dn
				}
			}
		}

		platformIDs := row.PlatformIDs
		if platformIDs == nil {
			platformIDs = []string{}
		}

		contentPurposes := row.ContentPurposes
		if contentPurposes == nil {
			contentPurposes = []string{}
		}

		var insertedID string
		err := h.Pool.QueryRow(c.Request.Context(), `
			INSERT INTO contents (
				title, topic, pillar_id, category_id, platform_id, platform_ids, format,
				brief, content_purpose, content_purposes, posting_category, target_audience,
				planned_date, planned_week, day,
				reference, pic, created_by, status
			) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'DRAFT')
			RETURNING id
		`, title, topic, cleanUUIDStr(row.PillarID), cleanUUIDStr(row.CategoryID), cleanUUIDStr(row.PrimaryPlatformID), platformIDs, format,
			cleanStr(row.Brief), cleanStr(row.ContentPurpose), contentPurposes, cleanStr(row.PostingCategory), cleanStr(row.TargetAudience),
			plannedDate, plannedWeek, dayStr,
			cleanStr(row.Reference), cleanStr(row.PIC), user.ID).Scan(&insertedID)

		if err != nil {
			log.Printf("Import row %d insert error: %v", rowNum, err)
			skipped++
			errs = append(errs, importError{Row: rowNum, Field: "general", Message: "Gagal menyimpan baris ke database: " + err.Error()})
			continue
		}

		// Catat history approval
		_, _ = h.Pool.Exec(c.Request.Context(), `
			INSERT INTO approval_histories (content_id, action, from_status, to_status, comment, performed_by)
			VALUES ($1, 'CREATED', NULL, 'DRAFT', 'Konten berhasil diimpor secara massal', $2)
		`, insertedID, user.ID)

		imported++
	}

	c.JSON(http.StatusOK, gin.H{
		"imported": imported,
		"skipped":  skipped,
		"errors":   errs,
	})
}

// Helper functions for matching
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

func (h *Handler) loadPillarMap(ctx context.Context) (map[string]struct{ ID, Name string }, []string) {
	m := make(map[string]struct{ ID, Name string })
	var names []string
	rows, err := h.Pool.Query(ctx, "SELECT id, name FROM pillars ORDER BY name ASC")
	if err != nil {
		return m, names
	}
	defer rows.Close()
	for rows.Next() {
		var id, name string
		if rows.Scan(&id, &name) == nil {
			names = append(names, name)
			m[strings.ToLower(strings.TrimSpace(name))] = struct{ ID, Name string }{id, name}
		}
	}
	return m, names
}

func (h *Handler) loadPlatformMap(ctx context.Context) (map[string]struct{ ID, Name string }, []string) {
	m := make(map[string]struct{ ID, Name string })
	var names []string
	rows, err := h.Pool.Query(ctx, "SELECT id, name FROM platforms ORDER BY name ASC")
	if err != nil {
		return m, names
	}
	defer rows.Close()
	for rows.Next() {
		var id, name string
		if rows.Scan(&id, &name) == nil {
			names = append(names, name)
			m[strings.ToLower(strings.TrimSpace(name))] = struct{ ID, Name string }{id, name}
		}
	}
	return m, names
}

func matchPillar(input string, m map[string]struct{ ID, Name string }) (string, string, bool) {
	inLower := strings.ToLower(strings.TrimSpace(input))
	if inLower == "" {
		return "", "", false
	}
	// Exact
	if res, ok := m[inLower]; ok {
		return res.ID, res.Name, true
	}
	// Prefix / substring match
	for k, res := range m {
		if strings.Contains(k, inLower) || strings.Contains(inLower, k) {
			return res.ID, res.Name, true
		}
		// Match short names before parentheses
		if idx := strings.Index(k, "("); idx != -1 {
			short := strings.TrimSpace(k[:idx])
			if strings.Contains(inLower, short) || strings.Contains(short, inLower) {
				return res.ID, res.Name, true
			}
		}
	}
	return "", "", false
}

func matchPlatform(input string, m map[string]struct{ ID, Name string }) (string, string, bool) {
	inLower := strings.ToLower(strings.TrimSpace(input))
	if inLower == "" {
		return "", "", false
	}
	// Direct map check
	if res, ok := m[inLower]; ok {
		return res.ID, res.Name, true
	}
	// Keyword matching
	for k, res := range m {
		if strings.Contains(inLower, "insta") && strings.Contains(k, "insta") {
			return res.ID, res.Name, true
		}
		if strings.Contains(inLower, "face") && strings.Contains(k, "face") {
			return res.ID, res.Name, true
		}
		if strings.Contains(inLower, "tik") && strings.Contains(k, "tik") {
			return res.ID, res.Name, true
		}
		if strings.Contains(inLower, "you") && strings.Contains(k, "you") {
			return res.ID, res.Name, true
		}
		if strings.Contains(inLower, "link") && strings.Contains(k, "link") {
			return res.ID, res.Name, true
		}
		if strings.Contains(inLower, "web") && strings.Contains(k, "web") {
			return res.ID, res.Name, true
		}
		if (strings.Contains(inLower, "twitter") || strings.Contains(inLower, "x")) && strings.Contains(k, "twit") {
			return res.ID, res.Name, true
		}
		if strings.Contains(k, inLower) || strings.Contains(inLower, k) {
			return res.ID, res.Name, true
		}
	}
	return "", "", false
}

func splitMulti(s string) []string {
	f := func(c rune) bool {
		return c == ',' || c == ';' || c == '/' || c == '\n' || c == '\r'
	}
	return strings.FieldsFunc(s, f)
}

func containsStr(arr []string, target string) bool {
	for _, item := range arr {
		if item == target {
			return true
		}
	}
	return false
}
