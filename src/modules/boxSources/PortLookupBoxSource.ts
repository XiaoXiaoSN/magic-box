import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// curated well-known ports (IANA / common). number -> {service, description}
const PORTS: Record<number, { name: string; desc: string }> = {
  20: { name: 'FTP-DATA', desc: 'File Transfer (data)' },
  21: { name: 'FTP', desc: 'File Transfer (control)' },
  22: { name: 'SSH', desc: 'Secure Shell' },
  23: { name: 'Telnet', desc: 'Telnet' },
  25: { name: 'SMTP', desc: 'Simple Mail Transfer' },
  53: { name: 'DNS', desc: 'Domain Name System' },
  67: { name: 'DHCP', desc: 'DHCP server' },
  68: { name: 'DHCP', desc: 'DHCP client' },
  80: { name: 'HTTP', desc: 'Hypertext Transfer' },
  110: { name: 'POP3', desc: 'Post Office Protocol v3' },
  123: { name: 'NTP', desc: 'Network Time Protocol' },
  143: { name: 'IMAP', desc: 'Internet Message Access' },
  161: { name: 'SNMP', desc: 'Simple Network Management' },
  389: { name: 'LDAP', desc: 'Lightweight Directory Access' },
  443: { name: 'HTTPS', desc: 'HTTP over TLS' },
  445: { name: 'SMB', desc: 'Microsoft-DS / SMB' },
  465: { name: 'SMTPS', desc: 'SMTP over TLS' },
  587: { name: 'SMTP', desc: 'Mail submission' },
  636: { name: 'LDAPS', desc: 'LDAP over TLS' },
  993: { name: 'IMAPS', desc: 'IMAP over TLS' },
  995: { name: 'POP3S', desc: 'POP3 over TLS' },
  1433: { name: 'MSSQL', desc: 'Microsoft SQL Server' },
  1521: { name: 'Oracle', desc: 'Oracle database' },
  3306: { name: 'MySQL', desc: 'MySQL database' },
  3389: { name: 'RDP', desc: 'Remote Desktop' },
  5432: { name: 'PostgreSQL', desc: 'PostgreSQL database' },
  5672: { name: 'AMQP', desc: 'RabbitMQ / AMQP' },
  6379: { name: 'Redis', desc: 'Redis' },
  8080: { name: 'HTTP-alt', desc: 'HTTP alternate' },
  8443: { name: 'HTTPS-alt', desc: 'HTTPS alternate' },
  9200: { name: 'Elasticsearch', desc: 'Elasticsearch' },
  27017: { name: 'MongoDB', desc: 'MongoDB' },
};

// returns the IANA range label for a valid port number
function portRange(n: number): string {
  if (n <= 1023) return 'well-known';
  if (n <= 49151) return 'registered';
  return 'dynamic/private';
}

// builds the plaintext k:v representation used by KeyValueBoxTemplate
function kvToPlaintext(kv: Record<string, string>): string {
  return Object.entries(kv)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

export const PortLookupBoxSource = {
  name: 'Port Lookup',
  description: 'Look up a well-known port number or service name. ::port',
  defaultInput: '443 ::port',
  tag: '#',
  kind: 'Decode',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'port', 'portlookup')) return [];

    const query = trim(input).slice(0, 32);

    if (/^\d+$/.test(query)) {
      // number → service lookup
      const n = Number.parseInt(query, 10);

      if (n < 0 || n > 65535) {
        const kv: Record<string, string> = {
          Port: query,
          Service: 'invalid — out of range (0–65535)',
          Description: '',
          Range: 'n/a',
        };
        return [
          new BoxBuilder('Port Lookup', kvToPlaintext(kv))
            .setTemplate(KeyValueBoxTemplate)
            .setOptions(kv)
            .setPriority(this.priority)
            .build(),
        ];
      }

      const entry = PORTS[n];
      const range = portRange(n);

      const kv: Record<string, string> = entry
        ? {
            Port: String(n),
            Service: entry.name,
            Description: entry.desc,
            Range: range,
          }
        : {
            Port: String(n),
            Service: 'unassigned / not a well-known port',
            Description: '',
            Range: range,
          };

      return [
        new BoxBuilder('Port Lookup', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // name → port(s) lookup (case-insensitive)
    const needle = query.toLowerCase();
    const matches = Object.entries(PORTS)
      .filter(([, v]) => v.name.toLowerCase() === needle)
      .map(([port]) => port);

    if (matches.length > 0) {
      const kv: Record<string, string> = {
        Service: query,
        'Port(s)': matches.join(', '),
      };
      return [
        new BoxBuilder('Port Lookup', kvToPlaintext(kv))
          .setTemplate(KeyValueBoxTemplate)
          .setOptions(kv)
          .setPriority(this.priority)
          .build(),
      ];
    }

    // no match found — return an informational box
    const kv: Record<string, string> = {
      Service: query,
      'Port(s)': 'no match in well-known port table',
    };
    return [
      new BoxBuilder('Port Lookup', kvToPlaintext(kv))
        .setTemplate(KeyValueBoxTemplate)
        .setOptions(kv)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default PortLookupBoxSource;
