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
