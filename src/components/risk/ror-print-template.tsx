'use client';

import React from 'react';
import type { Risk, Signatories } from '@/lib/types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface RORPrintTemplateProps {
  risks: Risk[];
  unitName: string;
  campusName: string;
  year: number;
  signatories?: Signatories;
}

/**
 * RISK AND OPPORTUNITY REGISTER (ROR) PRINT TEMPLATE
 * Optimized for Landscape Folio (13" x 8.5") paper.
 * Uses a fixed table layout to prevent overlapping seen in previews.
 */
export function RORPrintTemplate({ risks, unitName, campusName, year, signatories }: RORPrintTemplateProps) {
  const safeDate = (d: any) => {
    if (!d) return '';
    const date = d instanceof Timestamp ? d.toDate() : new Date(d);
    return isNaN(date.getTime()) ? '' : format(date, 'MM/dd/yyyy');
  };

  const riskEntries = risks.filter(r => r.type === 'Risk');
  const opportunityEntries = risks.filter(r => r.type === 'Opportunity');
  const isFinal = risks.some(r => r.status === 'Closed' || (r.postTreatment && r.postTreatment.evidence));

  // SIGNATORIES
  const directorName = signatories?.qaoDirector || '____________________';

  return (
    <div style={{ 
      width: '12.5in', 
      margin: '0 auto', 
      backgroundColor: 'white', 
      color: 'black', 
      fontFamily: 'Arial, sans-serif',
      lineHeight: '1.2'
    }}>
      
      {/* 1. INSTITUTIONAL HEADER */}
      <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid black', paddingBottom: '10px' }}>
        <p style={{ margin: '0', fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase' }}>Republic of the Philippines</p>
        <h1 style={{ margin: '5px 0', fontSize: '18pt', fontWeight: '900', textTransform: 'uppercase' }}>Romblon State University</h1>
        <p style={{ margin: '0', fontSize: '10pt', fontWeight: 'bold' }}>Romblon, Philippines</p>
        
        <div style={{ marginTop: '15px' }}>
            <h2 style={{ margin: '0', fontSize: '14pt', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '2px' }}>RISK AND OPPORTUNITY REGISTER (ROR)</h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', marginTop: '10px', fontSize: '11pt', fontWeight: 'bold' }}>
                <span>FISCAL YEAR: <span style={{ textDecoration: 'underline', padding: '0 10px' }}>{year}</span></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '14px', height: '14px', border: '2px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: !isFinal ? 'black' : 'transparent' }}>
                        {!isFinal && <div style={{ width: '6px', height: '6px', backgroundColor: 'white' }} />}
                    </div>
                    <span>First Cycle</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '14px', height: '14px', border: '2px solid black', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isFinal ? 'black' : 'transparent' }}>
                        {isFinal && <div style={{ width: '6px', height: '6px', backgroundColor: 'white' }} />}
                    </div>
                    <span>Final Cycle</span>
                </div>
            </div>
        </div>
      </div>

      {/* 2. METADATA ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '10pt', fontWeight: 'bold', textTransform: 'uppercase' }}>
        <div>Campus/College/Unit: <span style={{ textDecoration: 'underline', marginLeft: '10px' }}>{unitName} ({campusName})</span></div>
        <div>Updated as of: <span style={{ textDecoration: 'underline', marginLeft: '10px' }}>{format(new Date(), 'MMMM d, yyyy')}</span></div>
      </div>

      {/* 3. MAIN MATRIX TABLE */}
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse', 
        border: '2px solid black',
        tableLayout: 'fixed'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={{ border: '1px solid black', padding: '4px', fontSize: '8pt', width: '8%' }}>OBJECTIVE</th>
            <th style={{ border: '1px solid black', padding: '4px', fontSize: '8pt', width: '14%' }}>RISK (R) / OPPORTUNITY (O) DESCRIPTION AND CAUSES</th>
            <th style={{ border: '1px solid black', padding: '4px', fontSize: '8pt', width: '10%' }}>CURRENT CONTROLS/ SITUATION</th>
            <th style={{ border: '1px solid black', padding: '2px', width: '30px' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '7pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Likelihood *</div>
            </th>
            <th style={{ border: '1px solid black', padding: '2px', width: '30px' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '7pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Consequence **</div>
            </th>
            <th style={{ border: '1px solid black', padding: '2px', width: '30px' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '7pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Magnitude (L x C)</div>
            </th>
            <th style={{ border: '1px solid black', padding: '2px', width: '30px' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '7pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Rating ***</div>
            </th>
            <th style={{ border: '1px solid black', padding: '4px', fontSize: '8pt', width: '14%' }}>TREATMENT ACTION PLAN</th>
            <th style={{ border: '1px solid black', padding: '4px', fontSize: '8pt', width: '9%' }}>RESPONSIBLE PERSON</th>
            <th style={{ border: '1px solid black', padding: '2px', width: '40px' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '7pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Target Date</div>
            </th>
            <th style={{ border: '1px solid black', padding: '2px', width: '40px' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '7pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Date Implemented</div>
            </th>
            <th style={{ border: '1px solid black', padding: '2px', width: '40px' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '7pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Monitoring Score</div>
            </th>
            <th style={{ border: '1px solid black', padding: '2px', width: '30px' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '7pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Res. Likelihood *</div>
            </th>
            <th style={{ border: '1px solid black', padding: '2px', width: '30px' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '7pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Res. Consequence **</div>
            </th>
            <th style={{ border: '1px solid black', padding: '2px', width: '30px' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '7pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Res. Magnitude</div>
            </th>
            <th style={{ border: '1px solid black', padding: '2px', width: '30px' }}>
                <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', fontSize: '7pt', fontWeight: 'bold', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Res. Rating ***</div>
            </th>
          </tr>
        </thead>
        <tbody style={{ fontSize: '8pt' }}>
          {/* RISKS SECTION */}
          <tr style={{ backgroundColor: '#f3f4f6', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center' }}>
            <td colSpan={16} style={{ border: '1px solid black', padding: '4px' }}>I. Risks</td>
          </tr>
          {riskEntries.map((r) => (
            <tr key={r.id}>
              <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>{r.objective}</td>
              <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top', fontWeight: 'bold' }}>{r.description}</td>
              <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>{r.currentControls}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{r.preTreatment.likelihood}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{r.preTreatment.consequence}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: '900' }}>{r.preTreatment.magnitude}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: '900' }}>{r.preTreatment.rating?.charAt(0)}</td>
              <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>{r.treatmentAction}</td>
              <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase' }}>{r.responsiblePersonName}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{safeDate(r.targetDate)}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{r.postTreatment?.dateImplemented || ''}</td>
              <td style={{ border: '1px solid black', padding: '2px', verticalAlign: 'top', fontSize: '7pt' }}>{r.monitoringScore}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{r.postTreatment?.likelihood || ''}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{r.postTreatment?.consequence || ''}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: '900' }}>{r.postTreatment?.magnitude || ''}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: '900' }}>{r.postTreatment?.rating?.charAt(0) || ''}</td>
            </tr>
          ))}
          {riskEntries.length === 0 && (
            <tr><td colSpan={16} style={{ border: '1px solid black', padding: '20px', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>No Risk entries recorded.</td></tr>
          )}

          {/* OPPORTUNITIES SECTION */}
          <tr style={{ backgroundColor: '#f3f4f6', fontWeight: '900', textTransform: 'uppercase', textAlign: 'center' }}>
            <td colSpan={16} style={{ border: '1px solid black', padding: '4px' }}>II. Opportunities</td>
          </tr>
          {opportunityEntries.map((r) => (
            <tr key={r.id}>
              <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>{r.objective}</td>
              <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top', fontWeight: 'bold' }}>{r.description}</td>
              <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>{r.currentControls}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{r.preTreatment.likelihood}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{r.preTreatment.consequence}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: '900' }}>{r.preTreatment.magnitude}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: '900' }}>{r.preTreatment.rating?.charAt(0)}</td>
              <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top' }}>{r.treatmentAction}</td>
              <td style={{ border: '1px solid black', padding: '4px', verticalAlign: 'top', textAlign: 'center', fontWeight: 'bold', textTransform: 'uppercase' }}>{r.responsiblePersonName}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{safeDate(r.targetDate)}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{r.postTreatment?.dateImplemented || ''}</td>
              <td style={{ border: '1px solid black', padding: '2px', verticalAlign: 'top', fontSize: '7pt' }}>{r.monitoringScore}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{r.postTreatment?.likelihood || ''}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center' }}>{r.postTreatment?.consequence || ''}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: '900' }}>{r.postTreatment?.magnitude || ''}</td>
              <td style={{ border: '1px solid black', padding: '2px', textAlign: 'center', fontWeight: '900' }}>{r.postTreatment?.rating?.charAt(0) || ''}</td>
            </tr>
          ))}
          {opportunityEntries.length === 0 && (
            <tr><td colSpan={16} style={{ border: '1px solid black', padding: '20px', textAlign: 'center', color: '#999', fontStyle: 'italic' }}>No Opportunity entries recorded.</td></tr>
          )}
        </tbody>
      </table>

      {/* 4. SIGNATORIES */}
      <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '60px', textTransform: 'uppercase', fontWeight: '900', fontSize: '10pt' }}>
        <div style={{ textAlign: 'center' }}>
            <p style={{ textAlign: 'left', marginBottom: '40px', opacity: '0.6', fontSize: '9pt' }}>Prepared by:</p>
            <div style={{ borderBottom: '2px solid black', paddingBottom: '2px' }}>
                {risks[0]?.preparedBy || 'UNIT HEAD'}
            </div>
            <p style={{ marginTop: '5px', fontSize: '8pt', color: '#666' }}>Unit Representative</p>
        </div>
        <div style={{ textAlign: 'center' }}>
            <p style={{ textAlign: 'left', marginBottom: '40px', opacity: '0.6', fontSize: '9pt' }}>Monitored by:</p>
            <div style={{ borderBottom: '2px solid black', paddingBottom: '2px' }}>
                &nbsp;
            </div>
            <p style={{ marginTop: '5px', fontSize: '8pt', color: '#666' }}>Unit Coordinator</p>
        </div>
        <div style={{ textAlign: 'center' }}>
            <p style={{ textAlign: 'left', marginBottom: '40px', opacity: '0.6', fontSize: '9pt' }}>Approved by:</p>
            <div style={{ borderBottom: '2px solid black', paddingBottom: '2px', color: '#1B6535' }}>
                {campusName.toUpperCase().includes('MAIN') ? 'UNIT HEAD / DIRECTOR' : 'CAMPUS DIRECTOR'}
            </div>
            <p style={{ marginTop: '5px', fontSize: '8pt', color: '#666' }}>Authorized Official</p>
        </div>
      </div>

      {/* 5. FOOTER CONTROL INFO */}
      <div style={{ marginTop: '40px', paddingTop: '10px', borderTop: '2px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '8pt', color: '#999', fontStyle: 'italic' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <p style={{ fontWeight: '900', color: 'black', fontStyle: 'normal' }}>Form: QAO-03-002 | REV 03-2025</p>
            <p>Creation Date: 2021-02-14 | Revision Date: 2025-02-10</p>
        </div>
        <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12pt', fontWeight: '900', color: 'black', fontStyle: 'normal' }}>ROR Registry Year: {year}</p>
            <p style={{ marginTop: '2px' }}>Authenticated via RSU EOMS Digital Portal</p>
        </div>
      </div>
    </div>
  );
}
