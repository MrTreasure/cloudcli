/** Publish new build resources to Workers Static Assets before releasing HTML.
 * Legacy /v1/ objects remain in R2 for already published releases.
 */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {publishAssets} from '../../cloudflare-sites/scripts/assets.mjs';
const config=JSON.parse(await readFile(new URL('./static-cdn.json',import.meta.url),'utf8'));
const site='cloudcli';
if(config.hosting!=='workers-static-assets'||config.base!==`https://assets.mrtreasure.cc/${site}/v2/`)throw new Error('Invalid static publication scope');
// Public edge acceptance is opt-in; retain local credential/size gates and asset-before-HTML ordering.
await publishAssets({site,directory:resolve(import.meta.dirname,'../dist'),verifyPublic:process.env.CLOUDCLI_VERIFY_PUBLIC_ASSETS==='1'});
