import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// epochs: discord = 2015-01-01T00:00:00Z, twitter = 2010-11-04T01:42:54.657Z
const DISCORD_EPOCH = 1420070400000n;
const TWITTER_EPOCH = 1288834974657n;

// u64 max (18446744073709551615) is exactly 20 decimal digits
const MAX_SNOWFLAKE_LENGTH = 20;
const MAX_SNOWFLAKE = 18446744073709551615n;

export const SnowflakeBoxSource = {
  defaultDisabled: true,
  name: 'Snowflake',
  description:
    'Parse a Snowflake ID (Discord/Twitter) into its timestamp and components.',
  defaultInput: '175928847299117063 ::snowflake',
  tag: '#',
  kind: 'Analyze',
  priority: Priority,

  async generateBoxes(
    input: string,
    options: BoxOptions = null,
  ): Promise<Box[]> {
    if (!hasOptionKeys(options, 'snowflake')) return [];

    const raw = trim(input);
    if (!/^\d+$/.test(raw) || raw.length > MAX_SNOWFLAKE_LENGTH) return [];

    const id = BigInt(raw);
    if (id > MAX_SNOWFLAKE) return [];

    const epochOption = extractOptionKeys(options, 'snowflake', 'epoch');
    const useTwitter = epochOption === 'twitter';
    const epoch = useTwitter ? TWITTER_EPOCH : DISCORD_EPOCH;
    const epochLabel = useTwitter ? 'Twitter' : 'Discord';

    const timestampMs = Number((id >> 22n) + epoch);
    const timestamp = new Date(timestampMs).toISOString();
    // the 5+5 internal bits mean different things per platform
    const highId = ((id >> 17n) & 0x1fn).toString();
    const lowId = ((id >> 12n) & 0x1fn).toString();
    const increment = (id & 0xfffn).toString();

    const kvOptions: Record<string, string> = {
      Timestamp: timestamp,
      'Unix (ms)': timestampMs.toString(),
      [useTwitter ? 'Datacenter ID' : 'Worker ID']: highId,
      [useTwitter ? 'Worker ID' : 'Process ID']: lowId,
      Increment: increment,
      Epoch: epochLabel,
    };

    const plaintext = Object.entries(kvOptions)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');

    return [
      new BoxBuilder('Snowflake', plaintext)
        .setOptions(kvOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(this.priority)
        .build(),
    ];
  },
};

export default SnowflakeBoxSource;
