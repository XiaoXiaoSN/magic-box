import { DefaultBoxTemplate } from '@components/BoxTemplate';
import { isString, trim } from '@functions/helper';
import { BoxBuilder } from '@modules/Box';

import type { Box } from '@modules/Box';

interface IPInfoResponse {
  city: string;
  country: string;
  ip: string;
  loc: string;
  org: string;
  postal: string;
  readme: string;
  region: string;
  timezone: string;
}

const PriorityMyIP = 10;

interface Match {
  ip: string;
  location?: string;
  colocation?: string;
}

export const MyIPBoxSource = {
  name: 'My IP',
  description: 'Get your public IP address.',
  defaultInput: 'ip',

  async checkMatch(
    input: string,
  ): Promise<Match | undefined> {
    if (!isString(input)) {
      return undefined;
    }
    const regularInput = trim(input).toLowerCase();

    if (!['ip', 'myip'].includes(regularInput)) {
      return undefined;
    }

    try {
      const token = process.env.IPINFO_TOKEN;
      let ipInfoURL = 'https://ipinfo.io/json';
      if (token) {
        ipInfoURL = `${ipInfoURL}?token=${token}`;
      }

      const request = await fetch(ipInfoURL);
      const ipInfo: IPInfoResponse = await request.json();

      return {
        ip: ipInfo.ip,
        location: ipInfo.country,
        colocation: ipInfo.city,
      };
    } catch { /* */ }

    return undefined;
  },

  async generateBoxes(
    input: string,
  ): Promise<Box[]> {
    const match = await this.checkMatch(input);
    if (!match) {
      return [];
    }

    const { ip, location, colocation } = match;

    let displayText = ip;
    if (location && colocation) {
      displayText = `${ip} (${colocation}, ${location})`;
    }

    return [
      new BoxBuilder('My IP', displayText)
        .setPriority(PriorityMyIP)
        .setTemplate(DefaultBoxTemplate)
        .build(),
    ];
  },
};

export default MyIPBoxSource;
