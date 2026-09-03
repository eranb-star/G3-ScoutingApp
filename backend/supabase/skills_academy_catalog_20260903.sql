-- G3 6740 Skills Academy starter catalog.
-- Safe to run repeatedly: existing course/module titles are updated, never duplicated.
begin;

create temporary table g3_course_catalog(
  title text primary key,
  description text not null,
  domain text not null,
  target_subteam text,
  required boolean not null
) on commit drop;

insert into g3_course_catalog values
('FRC 6740 Team Onboarding','Understand the FRC season, match flow, team roles, workshop expectations and how G3 6740 works together.','safety',null,true),
('Workshop and Tool Safety','Recognize workshop hazards, inspect tools, select PPE and demonstrate safe operation before independent work.','safety',null,true),
('Mechanical Fabrication Foundations','Measure, mark, cut, drill, deburr, fasten and inspect common FRC robot parts using reliable build practices.','mechanical','mechanical',false),
('FRC Mechanism Design and Prototyping','Turn game needs into testable requirements, prototype mechanisms and make evidence-based design decisions.','mechanical','mechanical',false),
('Onshape CAD for FRC','Build constrained parts, multi-part studios and assemblies using an FRC-focused Onshape workflow.','cad','mechanical',false),
('FRC Electrical, CAN and Pneumatics','Wire and label an FRC control system, protect power paths and diagnose common CAN, sensor and pneumatic faults.','electrical','electronics',false),
('WPILib Command-Based Programming','Create, deploy and test safe subsystem-based robot code using current WPILib practices.','software','software',false),
('Sensors, Controls and Autonomous','Validate sensors, tune closed-loop mechanisms and build repeatable autonomous behavior with logs and tests.','software','software',false),
('Scouting and Match Strategy','Collect accurate observations, turn data into match plans and communicate concise alliance strategy.','strategy','strategy',false),
('Pit Operations and Robot Reliability','Use readiness checks, disciplined triage and repair verification to return a safe, reliable robot to the field.','drive_pit',null,false);

update public.training_courses c set
  description=x.description, domain=x.domain, target_subteam=x.target_subteam,
  required=x.required, active=true
from g3_course_catalog x where c.title=x.title;

insert into public.training_courses(title,description,domain,target_subteam,required,active)
select title,description,domain,target_subteam,required,true from g3_course_catalog x
where not exists(select 1 from public.training_courses c where c.title=x.title);

create temporary table g3_module_catalog(
  course_title text not null,
  module_title text not null,
  instructions text not null,
  sort_order integer not null,
  evidence_required boolean not null default true,
  primary key(course_title,module_title)
) on commit drop;

insert into g3_module_catalog values
('FRC 6740 Team Onboarding','FRC season and match fundamentals','Complete Spectrum 3847 FRC orientation modules F1.1-F1.7: https://www.spectrum3847.org/resources/training/ . In your evidence, explain the season stages, match periods and three event roles in your own words.',10,true),
('FRC 6740 Team Onboarding','G3 operating standards','Review G3 workshop rules, communication channels, attendance, assignments and escalation paths with a team lead. Submit a short scenario showing where you would report a safety concern, robot fault and schedule conflict.',20,true),
('FRC 6740 Team Onboarding','Meeting and event shadow','Shadow one full workshop meeting or event role. Submit what you observed, what you contributed and the next responsibility you can perform independently.',30,true),

('Workshop and Tool Safety','Hazards, PPE and stop-work authority','Review the current FIRST safety guidance with a mentor and Spectrum shop introduction B1.1: https://www.spectrum3847.org/resources/training/ . Submit a workshop hazard walk identifying at least five controls. Always follow current FIRST rules and G3 local procedures.',10,true),
('Workshop and Tool Safety','Tool inspection and demonstration','With an authorized mentor, inspect and demonstrate only the tools approved for your level. Evidence must name the PPE, pre-use inspection, safe operating zone and shutdown steps for each tool.',20,true),
('Workshop and Tool Safety','Practical safety check','Complete a live mentor-observed setup, operation and cleanup. The mentor must confirm safe behavior; written or video study alone is not sufficient.',30,true),

('Mechanical Fabrication Foundations','Materials, measurement and drawings','Study Spectrum modules D2.7-D2.8 and the relevant build resources: https://www.spectrum3847.org/resources/training/ . Submit a marked-up drawing and material choice for a simple FRC bracket.',10,true),
('Mechanical Fabrication Foundations','Cut, drill, deburr and fasten','Fabricate a mentor-approved practice part from a drawing. Submit measurements, photos of finished edges and the fastener/retention method used. Do not include student faces.',20,true),
('Mechanical Fabrication Foundations','Assembly quality inspection','Assemble a small mechanism or frame section, then complete a peer inspection for alignment, looseness, interference and serviceability. Submit the inspection findings and corrections.',30,true),

('FRC Mechanism Design and Prototyping','Requirements and minimum competitive concept','Study Spectrum design and Minimum Competitive Concept resources: https://spectrum3847.org/resources/ . Convert a sample game objective into measurable requirements, constraints and a deliberately limited first concept.',10,true),
('FRC Mechanism Design and Prototyping','Prototype with a test plan','Build or simulate a low-cost prototype. Define success metrics before testing, record at least three trials and separate observations from assumptions.',20,true),
('FRC Mechanism Design and Prototyping','Design review decision','Present two concepts with evidence, risks, weight/service considerations and a recommendation. Save the approved rationale in the G3 engineering decision log.',30,true),

('Onshape CAD for FRC','CAD and Onshape fundamentals','Complete FRCDesign Stage 1A from its official learning course: https://frcdesign.org/learning-course/ . Submit links to the required constrained sketches, tube and plate exercises.',10,true),
('Onshape CAD for FRC','FRC part and assembly workflow','Model a mentor-approved FRC mechanism section using correct document organization, named features, standard components and mates. Follow the current FRCDesign best practices.',20,true),
('Onshape CAD for FRC','Design-for-manufacture review','Produce a drawing or manufacturing package for one part. Submit a peer review covering tolerances, tool access, fasteners, collisions and whether G3 can actually manufacture it.',30,true),

('FRC Electrical, CAN and Pneumatics','Control-system architecture','Complete the current WPILib Zero-to-Robot hardware overview: https://docs.wpilib.org/en/stable/index.html and Spectrum control-system modules: https://www.spectrum3847.org/resources/training/ . Submit a labeled G3 control-system diagram.',10,true),
('FRC Electrical, CAN and Pneumatics','Wire, label and inspect','On a training board or disabled robot, create a mentor-approved power/CAN/sensor connection and label it to G3 standards. Submit close-up photos without faces plus an inspection checklist.',20,true),
('FRC Electrical, CAN and Pneumatics','Fault isolation drill','Diagnose mentor-inserted electrical or CAN faults using status lights, measurements and logs. Submit the diagnostic sequence, root cause, correction and verification result.',30,true),

('WPILib Command-Based Programming','WPILib and command architecture','Complete the current WPILib setup and command-based introduction: https://docs.wpilib.org/en/stable/docs/software/commandbased/ . Identify subsystem ownership, commands, requirements and safe default behavior.',10,true),
('WPILib Command-Based Programming','Build and test a subsystem','Implement a small subsystem and commands in a branch. Submit the pull-request or commit link, test steps and evidence that outputs stop safely when disabled or interrupted.',20,true),
('WPILib Command-Based Programming','Deploy, log and review','Deploy to a simulator, training robot or approved robot session. Capture relevant logs, explain one failure you corrected and complete a peer code review.',30,true),

('Sensors, Controls and Autonomous','Sensor validation and units','Configure a sensor with explicit units, zeroing and plausibility checks. Submit a short log proving direction, range, repeatability and behavior after restart.',10,true),
('Sensors, Controls and Autonomous','Closed-loop control','Study the official WPILib controls material: https://docs.wpilib.org/en/stable/docs/software/advanced-controls/index.html . Tune a safe training mechanism or simulation and submit plots/logs with the acceptance criteria.',20,true),
('Sensors, Controls and Autonomous','Autonomous verification','Build a repeatable autonomous sequence with clear start-state assumptions. Record multiple trials and report success rate, observed variation, failure handling and final verification.',30,true),

('Scouting and Match Strategy','Accurate observation','Review Spectrum strategy and scouting resources: https://www.spectrum3847.org/resources/training/ . Scout a recorded match, then compare your entry with a calibrated reference and explain discrepancies.',10,true),
('Scouting and Match Strategy','Data quality and insight','Audit a sample scouting set for missing, impossible or inconsistent values. Produce one defensible insight while clearly stating sample size and uncertainty.',20,true),
('Scouting and Match Strategy','Match-plan briefing','Prepare and deliver a two-minute match briefing covering alliance strengths, opponent threats, role priorities and contingencies. Submit the plan and mentor feedback.',30,true),

('Pit Operations and Robot Reliability','Readiness and maintenance','Study Spectrum maintenance/triage resources: https://spectrum3847.org/resources/ and selected FRC 971 engineering workshops: https://www.spartanrobotics.org/spartan-series . Complete a G3 pre-match readiness inspection.',10,true),
('Pit Operations and Robot Reliability','Timed triage drill','During a mentor-run drill, reproduce a robot symptom, gather evidence, isolate the subsystem and choose the safest next action under a time limit. Do not energize unsafe hardware.',20,true),
('Pit Operations and Robot Reliability','Repair verification and handoff','Perform or observe an approved repair, then document root cause, corrective action, functional test, inspection status and a concise drive-team handoff.',30,true);

update public.training_modules m set
  instructions=x.instructions, sort_order=x.sort_order, evidence_required=x.evidence_required
from g3_module_catalog x join public.training_courses c on c.title=x.course_title
where m.course_id=c.id and m.title=x.module_title;

insert into public.training_modules(course_id,title,instructions,sort_order,evidence_required)
select c.id,x.module_title,x.instructions,x.sort_order,x.evidence_required
from g3_module_catalog x join public.training_courses c on c.title=x.course_title
where not exists(
  select 1 from public.training_modules m where m.course_id=c.id and m.title=x.module_title
);

select c.title,c.domain,c.target_subteam,c.required,count(m.id) as module_count
from public.training_courses c left join public.training_modules m on m.course_id=c.id
where c.title in (select title from g3_course_catalog)
group by c.id,c.title,c.domain,c.target_subteam,c.required
order by c.title;

commit;
