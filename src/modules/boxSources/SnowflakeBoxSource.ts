import { KeyValueBoxTemplate } from '@components/BoxTemplate';
import { trim } from '@functions/helper';
import type { Box, BoxOptions } from '@modules/Box';
import { BoxBuilder, extractOptionKeys, hasOptionKeys } from '@modules/Box';

const Priority = 10;

// epochs: discord = 2015-01-01, twitter = 2010-11-04T01:00:00Z
const DISCORD_EPOCH = 1420070400000n;
const TWITTER_EPOCH = 1288834974657n;

// max safe snowflake length: 64-bit uint fits within ~20 digits; cap at 25 to reject junk
const MAX_SNOWFLAKE_LENGTH = 25;

export const SnowflakeBoxSource = {
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

    const epochOption = extractOptionKeys(options, 'snowflake', 'epoch');
    const useTwitter = epochOption === 'twitter';
    const epoch = useTwitter ? TWITTER_EPOCH : DISCORD_EPOCH;
    const epochLabel = useTwitter ? 'Twitter' : 'Discord';

    const timestampMs = Number((id >> 22n) + epoch);
    const timestamp = new Date(timestampMs).toISOString();
    const workerId = ((id >> 17n) & 0x1fn).toString();
    const processId = ((id >> 12n) & 0x1fn).toString();
    const increment = (id & 0xfffn).toString();

    const kvOptions: BoxOptions = {
      Timestamp: timestamp,
      'Unix (ms)': timestampMs.toString(),
      'Worker ID': workerId,
      'Process ID': processId,
      Increment: increment,
      Epoch: epochLabel,
    };

    return [
      new BoxBuilder('Snowflake', timestamp)
        .setOptions(kvOptions)
        .setTemplate(KeyValueBoxTemplate)
        .setPriority(Priority)
        .build(),
    ];
  },
};

export default SnowflakeBoxSource;
