package com.g3.scouting;

import org.junit.Test;
import static org.junit.Assert.*;

public class AutoCheckoutConfirmationTest {
 static class Phone implements AutoCheckoutConfirmation.Driver {
  long clock,confirmedAt=-1,cancelAt=Long.MAX_VALUE; int begins,confirms,beginFailures,confirmFailures;
  String failure; boolean active=true,terminal;
  public long now(){return clock;}
  public boolean active(){return active;}
  public void pause(long ms){clock+=ms;if(clock>=cancelAt)active=false;}
  public void begin()throws Exception{begins++;if(beginFailures-->0)throw new AutoCheckoutConfirmation.Retryable("network_unavailable");}
  public void confirm()throws Exception{confirms++;if(terminal)throw new Exception("rejected");if(confirmFailures-->0)throw new AutoCheckoutConfirmation.Retryable("location_unavailable");confirmedAt=clock;}
  public void failed(String reason){failure=reason;active=false;}
 }
 @Test public void confirmsOnlyAfterGrace(){Phone p=new Phone();AutoCheckoutConfirmation.run(p);assertEquals(301000,p.confirmedAt);assertEquals(1,p.confirms);assertNull(p.failure);}
 @Test public void retriesFreshConfirmationWithoutSkippingGrace(){Phone p=new Phone();p.beginFailures=2;p.confirmFailures=3;AutoCheckoutConfirmation.run(p);assertEquals(376000,p.confirmedAt);assertEquals(3,p.begins);assertEquals(4,p.confirms);}
 @Test public void returnOrLogoutCancels(){Phone p=new Phone();p.cancelAt=90000;AutoCheckoutConfirmation.run(p);assertEquals(0,p.confirms);assertNull(p.failure);}
 @Test public void noNetworkDoesNotClose(){Phone p=new Phone();p.beginFailures=1000;AutoCheckoutConfirmation.run(p);assertEquals("network_unavailable",p.failure);assertEquals(0,p.confirms);assertEquals(-1,p.confirmedAt);}
 @Test public void missingLocationExpiresWithoutClosing(){Phone p=new Phone();p.confirmFailures=1000;AutoCheckoutConfirmation.run(p);assertEquals("confirmation_timeout",p.failure);assertEquals(-1,p.confirmedAt);assertTrue(p.clock<900000);}
 @Test public void serverRejectionDoesNotRetryOrClose(){Phone p=new Phone();p.terminal=true;AutoCheckoutConfirmation.run(p);assertEquals("rejected",p.failure);assertEquals(1,p.confirms);assertEquals(-1,p.confirmedAt);}
}
