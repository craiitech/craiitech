/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL INTELLECTUAL PROPERTY NOTICE
 * ============================================================================
 *
 * CRAIITECH / ROMBLON STATE UNIVERSITY (RSU) - EOMS DIGITAL PORTAL
 * Copyright (c) 2025-2026 Romblon State University & CRAIITECH Development Team.
 * All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains the proprietary
 * property of Romblon State University and CRAIITECH. The intellectual and
 * technical concepts contained herein are proprietary to the owners and may
 * be covered by Philippine and foreign patents, patents in process, and are
 * protected by trade secret or copyright law.
 *
 * Dissemination of this information, reproduction of this material, reverse
 * engineering, decompilation, disassembly, or distribution of this code or any
 * portion thereof via any medium without prior written permission is strictly
 * prohibited and subject to civil and criminal liability under Republic Act
 * No. 8293 (Intellectual Property Code of the Philippines) and the Cybercrime
 * Prevention Act of 2012 (Republic Act No. 10175).
 * ============================================================================
 */

export interface SystemLicenseInfo {
  productName: string;
  version: string;
  licensedTo: string;
  licenseType: 'Institutional Enterprise License';
  issuedAt: string;
  isCompliant: boolean;
  legalNotice: string;
}

export const SYSTEM_LICENSE: SystemLicenseInfo = {
  productName: 'CRAIITECH RSU-EOMS Digital Document & Quality Assurance Portal',
  version: '1.0.0-enterprise',
  licensedTo: 'Romblon State University',
  licenseType: 'Institutional Enterprise License',
  issuedAt: '2026-01-01',
  isCompliant: true,
  legalNotice:
    'Licensed exclusively to Romblon State University. Unauthorized duplication, reverse engineering, redistribution, or source code extraction is strictly prohibited.',
};

/**
 * Validates the runtime environment against unauthorized distribution.
 * Can be hooked into server actions, background jobs, or admin middleware.
 */
export function verifySystemIntegrity(hostname?: string): {
  isValid: boolean;
  message: string;
} {
  // If running in development, allow local testing
  if (process.env.NODE_ENV === 'development') {
    return {
      isValid: true,
      message: 'System running in authorized development environment.',
    };
  }

  // Permitted domain whitelist for Romblon State University EOMS
  const AUTHORIZED_DOMAINS = [
    'localhost',
    '127.0.0.1',
    'craiitech.web.app',
    'craiitech.firebaseapp.com',
    'rsu.edu.ph',
    'eoms.rsu.edu.ph',
  ];

  if (hostname) {
    const isDomainAllowed = AUTHORIZED_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));

    if (!isDomainAllowed) {
      return {
        isValid: false,
        message: `Security Alert: Unauthorized host detected (${hostname}). Execution halted by system license guard.`,
      };
    }
  }

  return {
    isValid: true,
    message: 'System integrity verified.',
  };
}
