# Security

## Known Vulnerabilities

### xlsx Package (HIGH)

**Status:** Accepted risk with mitigation  
**Last reviewed:** 2026-04-04

#### Details

The `xlsx` package (used for Excel file conversion) has known high severity vulnerabilities:

- **CVE GHSA-4r6h-8v6p-xvw6**: Prototype Pollution (CVSS 7.8)
  - Affects: versions < 0.19.3
  - Type: CWE-1321 (Improperly Controlled Modification of Object Prototype Attributes)

- **CVE GHSA-5pgg-2g8v-p4x9**: Regular Expression Denial of Service (CVSS 7.5)
  - Affects: versions < 0.20.2
  - Type: CWE-1333 (Inefficient Regular Expression Complexity)

#### Current Version

- **Installed:** 0.18.5 (latest available on npm as of March 2022)
- **Required for fix:** >= 0.20.2
- **Issue:** Safe versions have not been published to npm registry

#### Risk Assessment

**Attack Vector:** Local file processing  
**User Interaction:** Required (user must provide malicious Excel file)  
**Impact:** High (potential code execution or DoS)

#### Mitigation Strategy

1. **Trusted Sources Only**: Excel files should only be ingested from trusted sources
2. **User Awareness**: Security checks warn users before processing files
3. **Sandboxed Execution**: Consider running in isolated environment for untrusted files
4. **Input Validation**: File type and content validation before processing

#### Alternatives Considered

| Alternative   | Status     | Reason for not using                   |
|---------------|------------|----------------------------------------|
| exceljs       | Available  | Breaking API changes, migration effort |
| node-xlsx     | Available  | Limited Excel format support           |
| sheetjs-style | Available  | Community fork, uncertain maintenance  |
| SheetJS Pro   | Commercial | Cost consideration                     |

#### Action Plan

- **Short term**: Document vulnerability, use trusted sources only
- **Medium term**: Monitor for npm release of safe version (>= 0.20.2)
- **Long term**: Evaluate migration to alternative library if no update available

#### For Users

When using `/neat-knowledge-ingest` with Excel files:

- Only process Excel files from trusted sources
- Be cautious with files from unknown or untrusted origins
- The skill includes security checks that warn about suspicious files
- Consider using PDF or CSV format for untrusted data

#### Reporting Security Issues

If you discover a security issue, please report it by opening a GitHub issue or contacting the maintainers directly.

## Security Best Practices

When using neat-knowledge skills:

1. **Review security warnings**: The ingest skill performs two-layer security checks (filename + content analysis)
2. **Verify content sources**: Especially for web pages and office documents
3. **Update credentials**: If the skill detects credentials in ingested content, update them immediately
4. **Trusted sources**: Only ingest content from sources you trust
5. **Regular updates**: Run `npm audit` periodically and update dependencies when safe versions are available

## Dependency Security

Check for security updates:

```bash
npm audit                    # Check for vulnerabilities
npm audit fix                # Apply automatic fixes (when available)
npm outdated                 # Check for package updates
```

Last security audit: 2026-04-04
