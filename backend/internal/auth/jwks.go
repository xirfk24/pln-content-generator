package auth

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"sync"
	"time"
)

// jwksCache fetches and caches Supabase signing keys (JWKS).
// New Supabase projects sign access tokens with ES256; the legacy HS256
// "JWT secret" no longer applies there.
type jwksCache struct {
	url    string
	client *http.Client

	mu       sync.RWMutex
	keys     map[string]*ecdsa.PublicKey // kid -> key
	fetchedAt time.Time
}

func newJWKSCache(supabaseURL string) *jwksCache {
	return &jwksCache{
		url:    supabaseURL + "/auth/v1/.well-known/jwks.json",
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

type jwksResponse struct {
	Keys []struct {
		Kty string `json:"kty"`
		Kid string `json:"kid"`
		Alg string `json:"alg"`
		Crv string `json:"crv"`
		X   string `json:"x"`
		Y   string `json:"y"`
	} `json:"keys"`
}

func (j *jwksCache) get(kid string) (*ecdsa.PublicKey, error) {
	j.mu.RLock()
	key, ok := j.keys[kid]
	fresh := time.Since(j.fetchedAt) < time.Hour
	j.mu.RUnlock()
	if ok && fresh {
		return key, nil
	}
	if err := j.refresh(); err != nil {
		if ok {
			return key, nil // stale key better than nothing
		}
		return nil, err
	}
	j.mu.RLock()
	defer j.mu.RUnlock()
	if key, ok := j.keys[kid]; ok {
		return key, nil
	}
	return nil, fmt.Errorf("key id %q not found in JWKS", kid)
}

func (j *jwksCache) refresh() error {
	resp, err := j.client.Get(j.url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks fetch: status %d", resp.StatusCode)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return err
	}
	var jr jwksResponse
	if err := json.Unmarshal(body, &jr); err != nil {
		return err
	}

	keys := map[string]*ecdsa.PublicKey{}
	for _, k := range jr.Keys {
		if k.Kty != "EC" || k.Crv != "P-256" {
			continue
		}
		key, err := ecdsaKeyFromJWK(k.X, k.Y)
		if err != nil {
			continue
		}
		keys[k.Kid] = key
	}

	j.mu.Lock()
	j.keys = keys
	j.fetchedAt = time.Now()
	j.mu.Unlock()
	return nil
}

func ecdsaKeyFromJWK(xB64, yB64 string) (*ecdsa.PublicKey, error) {
	x, err := decodeBase64URLBigInt(xB64)
	if err != nil {
		return nil, err
	}
	y, err := decodeBase64URLBigInt(yB64)
	if err != nil {
		return nil, err
	}
	return &ecdsa.PublicKey{Curve: elliptic.P256(), X: x, Y: y}, nil
}

func decodeBase64URLBigInt(s string) (*big.Int, error) {
	if s == "" {
		return nil, errors.New("empty coordinate")
	}
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}
	return new(big.Int).SetBytes(b), nil
}
