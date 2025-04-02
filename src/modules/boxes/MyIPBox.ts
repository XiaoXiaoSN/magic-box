import { DefaultBox } from '@components/Boxes';
import { isString, trim } from '@functions/helper';
import { Box, BoxBuilder } from '@modules/Box';

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
        .setComponent(DefaultBox)
        .build(),
    ];
  },
};

export default MyIPBoxSource;
