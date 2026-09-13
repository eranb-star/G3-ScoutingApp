// Run from repository root. Tools: gltf-transform 4.2.1 and meshoptimizer 0.25.0.
import {createRequire} from 'node:module';import {pathToFileURL} from 'node:url';import fs from 'node:fs';import crypto from 'node:crypto';
if(!process.env.G3_ASSET_TOOLS_PACKAGE)throw Error('Set G3_ASSET_TOOLS_PACKAGE to the isolated tools package.json');
const req=createRequire(process.env.G3_ASSET_TOOLS_PACKAGE);
const {NodeIO}=await import(pathToFileURL(req.resolve('@gltf-transform/core')));const {ALL_EXTENSIONS}=await import(pathToFileURL(req.resolve('@gltf-transform/extensions')));const {dedup,flatten,join,weld,simplify,prune,quantize}=await import(pathToFileURL(req.resolve('@gltf-transform/functions')));const {MeshoptSimplifier}=await import(pathToFileURL(req.resolve('meshoptimizer')));await MeshoptSimplifier.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
for(const name of ['field','robot']){const input=`apps/dashboard_web/public/twin/2026/${name}-model.glb`,output=`apps/dashboard_web/public/twin/2026/${name}-optimized.glb`;const doc=await io.read(input);await doc.transform(dedup(),flatten(),join(),weld(),simplify({simplifier:MeshoptSimplifier,ratio:.15,error:.001}),quantize(),prune());await io.write(output,doc);const bytes=fs.readFileSync(output);console.log(JSON.stringify({name,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),meshes:doc.getRoot().listMeshes().length}));}

