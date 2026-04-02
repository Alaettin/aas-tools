# Lessons Learned

## Supabase
- **Stale Connections nach Tab-Wechsel:** Bekanntes Problem. Fix: `startAutoRefresh`/`stopAutoRefresh` bei `visibilitychange` + Auth-Cache in localStorage + `withTimeout` als Safety-Net auf allen Fetches.
- **RLS Rekursion:** Admin-Policy auf `profiles` darf nicht `profiles` selbst queryen. Fix: `is_admin()` SECURITY DEFINER Funktion.
- **DELETE + INSERT Pattern:** Ohne Transaction gefährlich. Fix: Backup vor DELETE, Rollback bei INSERT-Fehler.

## React Hooks
- **Jeder Hook mit async Fetch braucht Cleanup.** Ohne `cancelled`/`mounted` Flag → State-Updates auf unmountete Komponenten → Loading-Spinner hängt.
- **`useCallback` in useEffect Dependencies:** Kann subtile Re-Runs verursachen. Besser: Inline-Funktionen + leeres Dependency Array `[]` wo möglich.
- **Early Return ohne `setLoading(false)`:** KILLER-BUG. `if (!user) return` ohne Loading zu resetten = ewiger Spinner.

## API Design
- **Keine `/v1/` Prefixe** in URLs ohne explizite User-Anfrage.
- **Edge Functions:** Nach Änderung immer redeployen UND die Quelldatei synchronisieren.

## UX
- **Confirm-Dialoge sparsam einsetzen.** User wollte es einfach — direkt speichern statt Modal.
- **`mouseDown` auf Modals:** `preventDefault()` allein verhindert nicht immer Text-Selektion. Besser: Modal komplett entfernen wenn nicht nötig.

## Workflow
- **Ordentlich planen statt Trial-and-Error.** Beim Supabase stale-connection Bug hätte ein gründlicher Plan (Root Cause Analyse zuerst) mehrere Iterationen gespart.
- **Debug-Logs einbauen** wenn die Ursache unklar ist — nicht blind Fixes probieren.
