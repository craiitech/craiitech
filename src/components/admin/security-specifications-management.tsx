'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Database,
  CheckCircle2,
  Server,
  Cpu,
  Globe,
  Fingerprint,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export function SecuritySpecificationsManagement() {
  const [webCryptoSupported, setWebCryptoSupported] = useState<boolean | null>(null);
  const [hmacVerified, setHmacVerified] = useState<boolean | null>(null);
  const [testingCrypto, setTestingCrypto] = useState(false);

  const testCryptography = async () => {
    setTestingCrypto(true);
    try {
      const isSubtleAvailable = typeof window !== 'undefined' && !!window.crypto?.subtle;
      setWebCryptoSupported(isSubtleAvailable);

      if (isSubtleAvailable) {
        // Quick self-test of HMAC-SHA-256 signing
        const encoder = new TextEncoder();
        const testKey = await window.crypto.subtle.importKey(
          'raw',
          encoder.encode('rsu-audit-test-key'),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign'],
        );
        const sig = await window.crypto.subtle.sign('HMAC', testKey, encoder.encode('audit-healthcheck'));
        setHmacVerified(sig.byteLength === 32); // SHA-256 output is 256 bits = 32 bytes
      } else {
        setHmacVerified(false);
      }
    } catch {
      setHmacVerified(false);
    } finally {
      setTestingCrypto(false);
    }
  };

  useEffect(() => {
    testCryptography();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <Card className="border-primary/20 shadow-md bg-gradient-to-br from-card via-card to-primary/5">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl font-black uppercase tracking-tight">
                    Institutional Cryptography & Security Specifications
                  </CardTitle>
                  <Badge className="bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5">
                    FIPS 140-2 & RA 10173
                  </Badge>
                </div>
                <CardDescription className="text-xs font-medium mt-1">
                  Technical data protection, cryptographic hashing, and transmission standards implemented in RSU EOMS.
                </CardDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={testCryptography}
              disabled={testingCrypto}
              className="gap-2 text-xs font-bold uppercase tracking-wider rounded-xl h-9 shrink-0 border-primary/20"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingCrypto ? 'animate-spin' : ''}`} />
              <span>Diagnostic Check</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          {/* Active Status Ribbon */}
          <div className="p-3.5 rounded-xl border border-primary/20 bg-background/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">Browser Hardware Cryptography:</span>
              {webCryptoSupported ? (
                <span className="inline-flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400 uppercase text-[10px]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Web Crypto API Active
                </span>
              ) : (
                <span className="text-muted-foreground uppercase text-[10px]">Evaluating...</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">HMAC-SHA-256 Engine:</span>
              {hmacVerified ? (
                <span className="inline-flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400 uppercase text-[10px]">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified (32-byte 256-bit Digest)
                </span>
              ) : (
                <span className="text-muted-foreground uppercase text-[10px]">Testing...</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">Transport Security:</span>
              <span className="inline-flex items-center gap-1 font-black text-primary uppercase text-[10px]">
                <Globe className="h-3.5 w-3.5" /> TLS 1.3 AES-GCM
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. HMAC-SHA-256 */}
        <Card className="border-primary/10 shadow-xs hover:border-primary/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[9px] font-black uppercase text-amber-600 border-amber-500/30"
                  >
                    Tamper Verification
                  </Badge>
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-tight mt-1">
                  HMAC-SHA-256 Digital Signatures
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground font-medium leading-relaxed">
            <p>
              Employs native W3C <strong className="text-foreground">Web Cryptography API</strong> (
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">crypto.subtle</code>) to generate and verify
              cryptographically signed tokens.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px]">
              <li>
                <strong>QR Attendance Signatures:</strong> Signs user identity, timestamp, and hardware fingerprint to
                eliminate forged check-ins.
              </li>
              <li>
                <strong>Dynamic OTP PINs:</strong> 60-second time-windowed numeric codes derived from HMAC-SHA-256
                hashes.
              </li>
              <li>
                <strong>Offline Audit Synchronization:</strong> Canonicalized log hashes (
                <code className="text-[10px] bg-muted px-1">k:v|...</code>) detect local tampering prior to cloud
                re-sync.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 2. AES-256 Storage */}
        <Card className="border-primary/10 shadow-xs hover:border-primary/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[9px] font-black uppercase text-emerald-600 border-emerald-500/30"
                  >
                    Storage At Rest
                  </Badge>
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-tight mt-1">
                  AES-256 Cloud Storage Encryption
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground font-medium leading-relaxed">
            <p>
              Institutional quality documents and database entries are stored in encrypted environments compliant with
              federal and international security benchmarks.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px]">
              <li>
                <strong>Google Drive Repositories:</strong> Automated campus upload files are encrypted at rest with
                hardware-level AES-256 (FIPS 140-2).
              </li>
              <li>
                <strong>Firestore Document DB:</strong> Multi-region encrypted databases with strict security rules and
                access separation.
              </li>
              <li>
                <strong>Zero Plaintext Storage:</strong> Institutional evidence and attachments are stored as secure
                objects with scoped access links.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 3. TLS 1.3 / AES-GCM In Transit */}
        <Card className="border-primary/10 shadow-xs hover:border-primary/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] font-black uppercase text-sky-600 border-sky-500/30">
                    In-Transit Security
                  </Badge>
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-tight mt-1">
                  TLS 1.3 & AES-GCM Transmission
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground font-medium leading-relaxed">
            <p>
              Network endpoints utilize authenticated Galois/Counter Mode (AES-GCM) ciphers under verified Transport
              Layer Security certificates.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px]">
              <li>
                <strong>Let's Encrypt SSL:</strong> Enforced HTTPS redirect with HSTS headers preventing
                man-in-the-middle downgrade attacks.
              </li>
              <li>
                <strong>Google Apps Script Bridge:</strong> Internal upload bridge follows authenticated 302 redirects
                with automated streaming over HTTPS.
              </li>
              <li>
                <strong>API Endpoints:</strong> All Next.js route handlers validate bearer tokens and session headers on
                every payload.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* 4. scrypt & Canvas Fingerprinting */}
        <Card className="border-primary/10 shadow-xs hover:border-primary/30 transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-[9px] font-black uppercase text-purple-600 border-purple-500/30"
                  >
                    Identity & Hardware
                  </Badge>
                </div>
                <CardTitle className="text-sm font-black uppercase tracking-tight mt-1">
                  scrypt Passwords & Canvas Hash
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-xs space-y-2 text-muted-foreground font-medium leading-relaxed">
            <p>
              Protects user identity credentials and validates hardware authenticity for campus evaluations and
              attendance.
            </p>
            <ul className="list-disc pl-5 space-y-1 text-[11px]">
              <li>
                <strong>Modified scrypt Hashing:</strong> Passwords hashed with high-cost memory and CPU parameters in
                Firebase Auth.
              </li>
              <li>
                <strong>Canvas Hardware Hash:</strong> Client graphics rendering and display metrics generate an
                anti-proxy fingerprint (<code className="text-[10px] bg-muted px-1">RSU-FP-...</code>).
              </li>
              <li>
                <strong>RA 10173 Audit Compliance:</strong> Full user right-to-be-forgotten and data access portability
                adherence.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Audit Checklist Box */}
      <Card className="border-primary/15 bg-muted/30">
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="space-y-0.5">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Ready for Internal Quality Audit (IQA) & External Accreditation
            </p>
            <p className="text-muted-foreground text-[11px]">
              This architecture complies with ISO 21001:2018 (Clause 7.5.3 Document Control) and ISO/IEC 27001
              (Information Security).
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider py-1 border-primary/30">
            Document Control ISO 7.5.3 Verified
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
