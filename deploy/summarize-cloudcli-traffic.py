#!/usr/bin/env python3
"""Summarize query-free Nginx records; never output headers, bodies or raw log lines."""
import argparse
import collections
import datetime
import json
import re
from zoneinfo import ZoneInfo


def summarize(lines, day, timezone):
    groups = {}
    for line in lines:
        match = re.search(r'\[([^]]+)\] "(\w+) ([^"? ]+)(?:[^\"]*)" (\d+)', line)
        if not match:
            continue
        timestamp, method, path, status = match.groups()
        instant = datetime.datetime.strptime(timestamp, '%d/%b/%Y:%H:%M:%S %z')
        if instant.astimezone(ZoneInfo(timezone)).date().isoformat() != day:
            continue
        # Bound cardinality and avoid listing individual session/project identifiers.
        path = re.sub(r'/(sessions|projects)/[^/]+/', r'/\1/:id/', path)
        key = (method, path, int(status))
        row = groups.setdefault(key, dict(method=method, path=path, status=int(status), requests=0,
            measured_requests=0, request_length=0, body_bytes_sent=0, bytes_sent=0, request_seconds=0.0, gzip_responses=0))
        row['requests'] += 1
        values = dict(re.findall(r'(request_length|body_bytes_sent|bytes_sent|request_time|content_encoding)=([^ ]+)', line))
        if all(values.get(field, '-').isdigit() for field in ('request_length', 'body_bytes_sent', 'bytes_sent')):
            row['measured_requests'] += 1
            for field in ('request_length', 'body_bytes_sent', 'bytes_sent'):
                row[field] += int(values[field])
        try:
            row['request_seconds'] += float(values.get('request_time', 0))
        except ValueError:
            pass
        row['gzip_responses'] += values.get('content_encoding') == 'gzip'
    rows = sorted(groups.values(), key=lambda row: -row['requests'])
    for row in rows:
        if not row['measured_requests']:
            for field in ('request_length', 'body_bytes_sent', 'bytes_sent'):
                row[field] = None
    return dict(day=day, timezone=timezone, requests=sum(row['requests'] for row in rows),
        methods=dict(collections.Counter({method: sum(row['requests'] for row in rows if row['method'] == method)
            for method in {row['method'] for row in rows}})), groups=rows,
        notes=['Byte totals cover measured_requests only; missing historical bytes are unknown, not zero.',
            'request_length includes request line and headers; Nginx bytes exclude full TLS/TCP overhead.',
            'WebSocket request_time is connection lifetime, not API processing latency.'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--log', required=True)
    parser.add_argument('--day', required=True, help='Date in the selected timezone, e.g. 2026-10-24')
    parser.add_argument('--timezone', default='Asia/Shanghai')
    args = parser.parse_args()
    with open(args.log) as handle:
        print(json.dumps(summarize(handle, args.day, args.timezone), ensure_ascii=False, indent=2))
