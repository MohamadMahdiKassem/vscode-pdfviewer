# PDF Field Keys

Display PDF files in VS Code and label each form field with its key (the AcroForm field name stored in the PDF).

This is a fork of [tomoki1207/vscode-pdfviewer](https://github.com/tomoki1207/vscode-pdfviewer). Everything the original does still works.

![screenshot](https://user-images.githubusercontent.com/3643499/84454816-98fcd600-ac96-11ea-822c-3ae1e1599a13.gif)

## Field keys

When a PDF has form fields, two buttons appear at the right of the toolbar:

- **Tag button.** Shows or hides a label with the key inside each field.
- **Search button.** Opens a search box. Typing hides every label whose key doesn't contain the text (case-insensitive). Enter and Shift+Enter jump to the next and previous match on any page, and the current match turns blue. Escape closes the box and shows all labels again.

Hovering a field or its label darkens the label and brings it in front of overlapping labels. Clicking a label acts on its field: it toggles a checkbox or radio button, or puts the cursor in a text field.

The `pdf-preview.showFieldNames` setting (default `true`) decides whether labels are on when a PDF opens.

Only real AcroForm fields have keys. A flattened PDF has none, and XFA forms aren't rendered.

## Install

The extension isn't on the Marketplace. Install it from the `.vsix` file attached to a [GitHub release](https://github.com/MohamadMahdiKassem/vscode-pdfviewer/releases).

1. Uninstall the original **vscode-pdf** extension (`tomoki1207.pdf`) if you have it. Both open `.pdf` files.
1. Download the `.vsix` from the latest release, or run `gh release download -R MohamadMahdiKassem/vscode-pdfviewer -p '*.vsix'`.
1. Install it with `code --install-extension pdf-field-keys-<version>.vsix`, or in the Extensions view use `…` → **Install from VSIX…**.
1. Run **Developer: Reload Window**.

Updates aren't automatic. Install the new `.vsix` the same way when a new release comes out.

## Contribute

### Upgrade PDF.js

1. Download latest [Prebuilt(older browsers)](https://mozilla.github.io/pdf.js/getting_started/#download).
1. Extract the ZIP file.
1. Overwrite ./lib/* by extracted directories.
   - If lib/web/viewer.html has changes, apply these changes to HTML template at pdfPreview.ts.
1. To not use sample pdf.
  - Remove sample pdf called `compressed.tracemonkey-pldi-09.pdf`.
  - Remove code about using sample pdf from lib/web/viewer.js.
    ```js
    defaultUrl: {
      value: "", // "compressed.tracemonkey-pldi-09.pdf"
      kind: OptionKind.VIEWER
    },
    ```

## Change log
See [CHANGELOG.md](CHANGELOG.md).

## License
Please see [LICENSE](./LICENSE)
