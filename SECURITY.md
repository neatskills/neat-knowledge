# Security

## Current Security Status

**Last audit:** 2026-04-05  
**Vulnerabilities:** None (0 HIGH, 0 MODERATE, 0 LOW)

All dependencies audited and secure. Previous xlsx vulnerability resolved by migrating to node-xlsx.

## Security Best Practices

When using neat-knowledge skills:

1. **Review security warnings**: Ingest skill performs two-layer security checks (filename + content analysis)
2. **Verify content sources**: Especially for web pages and office documents
3. **Update credentials**: If skill detects credentials in content, update them immediately
4. **Trusted sources**: Only ingest content from sources you trust
5. **Regular updates**: Run `npm audit` periodically

## Dependency Security

Check for security updates:

```bash
npm audit        # Check for vulnerabilities
npm outdated     # Check for package updates
```

## Reporting Security Issues

Found a security issue? Please report it by:

- Opening a GitHub issue (for non-critical issues)
- Contacting maintainers directly (for critical vulnerabilities)

We take security seriously and will respond promptly.
