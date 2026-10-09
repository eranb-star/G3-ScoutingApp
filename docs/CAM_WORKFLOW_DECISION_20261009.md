# CAD/CAM discussion and current decision — 9 October 2026

Status: analysis only. User chose to retain the delivered Robot Build/CAD system for detailed review with students. The team does not currently use or commit to Onshape CAM Studio. No CAM integration, automatic export, machine-profile implementation or native CAM engine is authorized by this discussion.

Automatic native exports would generate revision/configuration-bound geometry/drawings (DXF/STEP/PDF etc.) into existing controlled work files. They do not generate toolpaths or G-code. Existing manually uploaded, revision-associated files remain usable; exports are an optional convenience gap, not a prerequisite for the delivered workflow.

The attached analysis considered the presumed SolidWorks/plugin → postprocessor → Mach3 process. Exact CAM plugin, machine/axes, controller settings, tools, materials, fixtures and known-good post/output remain to be confirmed by the team. Do not assume those are known. The earlier clarification question received no recorded answer.

Research performed in this conversation found official Onshape March2026 Mach3 post support (https://www.onshape.com/en/changelog/). Onshape CAM account entitlement and compatibility with the actual CNC remain unverified. No documented public end-to-end setup/toolpath/posting API was established in the reviewed material; do not promise automated CAM output retrieval. Sources: https://cad.onshape.com/help/Content/CAMStudio/cam_studios.htm and https://onshape-public.github.io/docs/api-adv/translation/ . These are dated research findings, not a new account or machine validation.

If the team later selects external CAM, proposed additions are job-to-CAM links, setup records, controlled posted-output packages, machine/post version identity, appropriate human review and operator qualification/run checks, and CAD/CAM/file change handling. Reuse existing jobs, stock, reviews, qualifications and audit; no second manufacturing system. The connector currently supports bounded JSON reads, not asynchronous/binary manufacturing exports; existing file types do not include G-code. These are future scope, not claims that the delivered BOM/workshop system is unusable.

Options considered: retain current SolidWorks workflow; test Onshape CAM first if access/machine fit; standalone Fusion/SheetCam/FreeCAD fallback; constrained G3 CAM only as a later separately selected project. Never start/control the CNC from G3. Human review and manual Mach3 loading remain the intended boundary. Hashing proves file identity, not machining correctness. CAD Mentor recommendations are not engineering certification.

A proposed proof of concept was a 100x100mm plate, four 5mm holes and one 22mm centre hole. Material, thickness, hole positions, tolerances, setup and tooling are unspecified. No toolpaths, feeds, physical test or approval exist. A future qualified pilot would verify geometry/setup/post, inspect output, air-cut, manufacture suitable test material and record actual QC. Backplot tools such as CAMotics do not establish complete fixture/machine collision safety.

Current priority is a genuine workshop pilot of existing Robot Build with the team's actual workflow, plus recorded physical APK/recovery acceptance gaps. Do not convert this recommendation into unrequested code changes or fictional physical evidence.
