/** Publish build resources before releasing the HTML entry. */
import { createHash } from 'node:crypto';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { parse } from 'yaml';
import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const { bucket, origin, base: cdn } = JSON.parse(await readFile(resolve(import.meta.dirname, 'static-cdn.json'), 'utf8'));
if (bucket !== 'mrtreasure-assets' || cdn !== 'https://assets.mrtreasure.cc/cloudcli/v1/') throw new Error('Invalid publication scope');
const prefix = new URL(cdn).pathname.slice(1);
const directory = resolve(import.meta.dirname, '../dist');
const sha256 = body => createHash('sha256').update(body).digest('hex');
const credentials = parse(await readFile(resolve(homedir(), '.secrets/passwords.yml'), 'utf8')).cloudflare.r2_admin;
const client = new S3Client({
  endpoint: credentials.endpoint, region: 'auto', maxAttempts: 2,
  credentials: { accessKeyId: credentials.access_key_id, secretAccessKey: credentials.secret_access_key },
  requestChecksumCalculation: 'WHEN_REQUIRED',
});
const send = command => client.send(command, { abortSignal: AbortSignal.timeout(30000) });
const types = { js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', svg: 'image/svg+xml', png: 'image/png', ico: 'image/x-icon', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', woff2: 'font/woff2', woff: 'font/woff', ttf: 'font/ttf' };
async function filesUnder(dir, parent = '') {
  const files = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = parent + item.name;
    if (item.isDirectory()) files.push(...await filesUnder(resolve(dir, item.name), path + '/'));
    else if (types[path.split('.').at(-1)] && (path.startsWith('assets/') || /\.(svg|png|ico|webp|jpe?g|gif)$/.test(path))) files.push(path);
  }
  return files;
}
async function publish(name) {
  const raw = await readFile(resolve(directory, name));
  const contentType = types[name.split('.').at(-1)];
  const compressed = /\.(js|css|svg)$/.test(name);
  const body = compressed ? gzipSync(raw, { level: 9 }) : raw;
  const immutable = name.startsWith('assets/');
  const key = `${prefix}${name}`;
  let existing;
  try { existing = await send(new HeadObjectCommand({ Bucket: bucket, Key: key })); }
  catch (error) { if (error.$metadata?.httpStatusCode !== 404) throw error; }
  const equal = existing?.Metadata?.sha256 === sha256(raw) && existing?.ContentLength === body.length && existing?.ContentType === contentType && existing?.ContentEncoding === (compressed ? 'gzip' : undefined);
  if (existing && immutable && !equal) throw new Error('ImmutableAssetMismatch');
  if (!equal) {
    await send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentLength: body.length,
      ContentType: contentType, ContentEncoding: compressed ? 'gzip' : undefined,
      CacheControl: immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
      Metadata: { sha256: sha256(raw) }, ...(existing ? { IfMatch: existing.ETag } : { IfNoneMatch: '*' }),
    }));
  }

}
try {
  let rules;
  try { rules = (await send(new GetBucketCorsCommand({ Bucket: bucket }))).CORSRules ?? []; }
  catch (error) { if (error.name !== 'NoSuchCORSConfiguration') throw error; rules = []; }
  const covers = method => rules.some(rule => rule.AllowedOrigins?.some(value => value === '*' || value === origin) && rule.AllowedMethods?.includes(method));
  if (!covers('GET') || !covers('HEAD')) {
    const backup = resolve('/vol1/1000/appdata/cloudcli/backups', new Date().toISOString().replaceAll(':', '-'));
    await mkdir(backup, { recursive: true, mode: 0o700 });
    await writeFile(resolve(backup, 'cors.before.json'), JSON.stringify({ CORSRules: rules }, null, 2), { mode: 0o600 });
    await send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: { CORSRules: [
      ...rules.filter(rule => rule.ID !== 'cloudcli-static-read'),
      { ID: 'cloudcli-static-read', AllowedOrigins: [origin], AllowedMethods: ['GET', 'HEAD'], ExposeHeaders: ['ETag'], MaxAgeSeconds: 3600 },
    ] } }));
  }
  const files = await filesUnder(directory);
  let index = 0;
  await Promise.all(Array.from({ length: 4 }, async () => { while (index < files.length) await publish(files[index++]); }));
  console.log(`All ${files.length} static resources published; HTML may now be published.`);
} catch (error) {
  console.error(`Static publication stopped: ${error.name}, HTTP ${error.$metadata?.httpStatusCode ?? 'unknown'}`);
  process.exitCode = 1;
} finally { client.destroy(); }
