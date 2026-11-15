package com.g3.scouting;

/** Bounded foreground verification; time never substitutes for location evidence. */
final class AutoCheckoutConfirmation {
 static final long GRACE_MS=301000, WINDOW_MS=840000, RETRY_MS=15000;
 static class Retryable extends Exception { Retryable(String code){super(code);} }
 interface Driver {
  long now(); boolean active(); void pause(long ms)throws InterruptedException;
  void begin()throws Exception; void confirm()throws Exception;
  void failed(String reason);
 }
 static void run(Driver d){
  try {
   long start=d.now();
   while(d.active()){
    try{d.begin();break;}catch(Retryable e){if(d.now()-start>=90000){d.failed(e.getMessage());return;}d.pause(RETRY_MS);}
   }
   if(!d.active())return;
   long accepted=d.now();
   while(d.active()){
    long elapsed=d.now()-accepted;
    if(elapsed>=WINDOW_MS){d.failed("confirmation_timeout");return;}
    if(elapsed<GRACE_MS){d.pause(Math.min(RETRY_MS,GRACE_MS-elapsed));continue;}
    try{d.confirm();return;}catch(Retryable e){d.pause(RETRY_MS);}
   }
  }catch(InterruptedException e){Thread.currentThread().interrupt();}
  catch(Exception e){if(d.active())d.failed(e.getMessage());}
 }
}
