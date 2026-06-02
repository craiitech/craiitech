# Profile Page – Global Save Button

The **Profile** page (`src/app/(dashboard)/profile/page.tsx`) now includes a **global "Save All Changes"** button that consolidates the saving of:

1. **Profile information** (name, sex, accessibility settings)
2. **Password updates**
3. **Account deletion**

## How it works

* The button is sticky at the top of the page, making it always visible while scrolling.
* It is enabled only when any of the three forms have unsaved changes (`hasPendingChanges`).
* Clicking the button triggers `handleGlobalSave`, which sequentially:
  1. Submits the profile form if dirty.
  2. Submits the password form if dirty.
  3. Submits the delete‑account form if dirty.
* Each individual handler (`onSubmit`, `handlePasswordUpdate`, `handleDeleteAccount`) already provides its own validation and toast notifications. Errors are displayed per‑form, and the global save continues with the remaining forms.
* After all successful operations, a toast **“All Changes Saved”** is shown and all forms are reset, clearing the dirty flags.

## UI Details

```tsx
<Button
  type="button"
  onClick={handleGlobalSave}
  disabled={!hasPendingChanges || isGlobalSaving}
  className="w-full max-w-md shadow-lg shadow-primary/20 font-black uppercase text-xs tracking-widest"
>
  {isGlobalSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
  Save All Changes
</Button>
```

* **Loading state** – shows a spinner while any of the saves are in progress.
* **Accessibility** – the button respects the same `canEdit` guard used by the individual forms.

## Testing notes

* Verify that modifying fields in any section enables the button.
* Confirm that clicking the button updates the data, shows the appropriate toasts, and resets the forms.
* Test with different user roles (admin, staff, student) to ensure permissions are respected.

---

For further details on the underlying form schemas, see the source code in `src/app/(dashboard)/profile/page.tsx`.

