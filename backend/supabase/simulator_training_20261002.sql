begin;
-- Extend the existing immutable shared trial history; no new permissions or grading paths.
alter table public.robot_trial_sessions drop constraint if exists robot_trial_sessions_protocol_check;
alter table public.robot_trial_sessions add constraint robot_trial_sessions_protocol_check
 check(protocol in ('can','intake','shooting','auto','driver'));
alter table public.robot_trial_sessions drop constraint if exists robot_trial_sessions_driver_simulated;
alter table public.robot_trial_sessions add constraint robot_trial_sessions_driver_simulated
 check(protocol<>'driver' or evidence_kind='simulated');
commit;
