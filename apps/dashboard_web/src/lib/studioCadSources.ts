/** Discovery links, deliberately separate from loadable, validated catalogue IDs. */
export const studioCadSources=[
 {name:'Limelight 1 / 2 / 3 / 3A / 3G / 4',category:'Vision',url:'https://docs.limelightvision.io/docs/resources/downloads',note:'Manufacturer STL / STEP downloads. Download STL and use Import GLB / STL.'},
 {name:'SDS MK4i · Falcon / NEO configurations',category:'Drivetrain',url:'https://www.swervedrivespecialties.com/collections/mk4i-module-kits/products/mk4i-swerve-module',note:'Manufacturer STEP assemblies. Convert through Onshape before importing.'},
 {name:'REV MAXSwerve, NEO Vortex, SPARK Flex, encoders and power modules',category:'Electronics',url:'https://www.revrobotics.com/resources/',note:'Choose the exact product and download its CAD. Not yet bundled in this library.'},
 {name:'CANivore, CANcoder, Pigeon 2, Talon SRX and Victor SPX',category:'Electronics',url:'https://store.ctr-electronics.com/collections/all-products',note:'Choose the exact CTRE product and CAD revision. Not yet bundled in this library.'},
 {name:'roboRIO 2.0 · manufacturer model',category:'Electronics',url:'https://andymark.com/products/ni-roborio-2-0',note:'Manufacturer STEP; distinct from the simplified roboRIO already available here.'},
 {name:'WCP gears, belts, shafts, wheels and mechanisms',category:'Transmission',url:'https://wcproducts.com/collections/viewall',note:'Supplier catalogue. Verify product CAD availability and reuse permission.'},
 {name:'AndyMark wheels, hardware, gearboxes and pneumatic parts',category:'Mechanism',url:'https://andymark.com/collections/mechanical-main-nav',note:'Supplier catalogue. Verify the exact size and variant before importing.'},
 {name:'Onshape FRC Parts Library',category:'Team CAD',url:'https://www.onshape.com/en/education/first-robotics',note:'Public FRC CAD resources. Import the chosen model through your authorised Onshape connection.'},
] as const;
