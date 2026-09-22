package handlers

import "testing"

// Setiap aksi yang masuk filter peran wajib punya definisi notifikasi.
// Kalau tidak, event-nya di-drop diam-diam di ListNotifications.
func TestNotificationDefsCoverRoleFilters(t *testing.T) {
	for role, filter := range map[string]map[string]bool{
		"ADMIN": adminNotifActions,
		"STAFF": staffNotifActions,
	} {
		for action := range filter {
			def, ok := notificationDefs[action]
			if !ok {
				t.Errorf("%s filter contains action %q without a notificationDefs entry", role, action)
				continue
			}
			if def.Type == "" || def.Title == "" {
				t.Errorf("notificationDefs[%q] has empty type or title", action)
			}
		}
	}

	// Aksi yang butuh aksi admin harus ada di filter ADMIN; aksi hasil
	// untuk staff harus ada di filter STAFF.
	for _, action := range []string{"SUBMITTED", "PRODUCTION_SUBMITTED"} {
		if !adminNotifActions[action] {
			t.Errorf("admin filter should include %q", action)
		}
		if staffNotifActions[action] {
			t.Errorf("staff filter should NOT include admin-only action %q", action)
		}
	}
	for _, action := range []string{"CONCEPT_REVISION_REQUESTED", "PRODUCTION_REVISION_REQUESTED", "REVISION_FROM_READY", "REJECTED", "APPROVED", "PRODUCTION_APPROVED", "SHORTCUT_READY"} {
		if !staffNotifActions[action] {
			t.Errorf("staff filter should include %q", action)
		}
	}
}

func TestCleanNotifIDs(t *testing.T) {
	got := cleanNotifIDs([]string{"a", "", " b", "a", "b"})
	want := []string{"a", " b", "b"}
	if len(got) != len(want) {
		t.Fatalf("cleanNotifIDs = %v, want %v", got, want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("cleanNotifIDs = %v, want %v", got, want)
		}
	}
}
