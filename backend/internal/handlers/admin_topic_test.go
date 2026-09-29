package handlers

import "testing"

// Self-check untuk komposisi label topik: kode + nama → "R - PLN Mobile",
// tanpa kode → nama polos. Ini yang dipakai dropdown & propagasi rename.
func TestLabelTopic(t *testing.T) {
	cases := []struct{ code, name, want string }{
		{"R", "PLN Mobile", "R - PLN Mobile"},
		{"", "Lain-Lain", "Lain-Lain"},
		{"EV", "SPKLU", "EV - SPKLU"},
	}
	for _, c := range cases {
		if got := labelTopic(c.code, c.name); got != c.want {
			t.Errorf("labelTopic(%q, %q) = %q, want %q", c.code, c.name, got, c.want)
		}
	}
}

// Self-check kanonlisasi topik: label lengkap, nama polos, dan kode
// (case-insensitive) mengarah ke label resmi yang sama; nilai bebas
// (caption/judul) jatuh ke topik resmi "Lain-Lain".
func TestCanonicalTopic(t *testing.T) {
	canon := map[string]string{}
	codes := map[string]string{}
	fallback := "Lain-Lain"
	addTopicCanon(canon, codes, &fallback, "R", "PLN Mobile")
	addTopicCanon(canon, codes, &fallback, "", "Topik Bebas")
	addTopicCanon(canon, codes, &fallback, "Z", "Lain-Lain")

	if fallback != "Z - Lain-Lain" {
		t.Errorf("fallback = %q, want %q", fallback, "Z - Lain-Lain")
	}
	cases := []struct{ raw, want string }{
		{"R - PLN Mobile", "R - PLN Mobile"},
		{"pln mobile", "R - PLN Mobile"},
		{"  r - pln mobile  ", "R - PLN Mobile"},
		{"R", "R - PLN Mobile"},
		{"Topik Bebas", "Topik Bebas"},
		{"Weekend = Mode Rebahan ON 😴", "Z - Lain-Lain"},
		{"", "Z - Lain-Lain"},
	}
	for _, c := range cases {
		if got := canonicalTopic(c.raw, canon, fallback); got != c.want {
			t.Errorf("canonicalTopic(%q) = %q, want %q", c.raw, got, c.want)
		}
	}
	if codes["R - PLN Mobile"] != "R" {
		t.Errorf(`codes["R - PLN Mobile"] = %q, want "R"`, codes["R - PLN Mobile"])
	}
}
