Solution for an automatic clean process
===============================================

# Description

For my XDisPlace project i try to find a solution to bring all processes together. I wrote a ToDo what i need to bring this project to fly. I realized, all what i need it's only to find a solution for an Automatic Cleaner Process.

To realize this we need follow steps:

## Hardware
* a pipe as vacuum cleaner pipe
* mount to pnp header on a specific position
* connect normal vacuum cleaner on this pipe
* the cleaner will controll over SONOFF device
* and a REST Interface with on/off cleaner (handle up to 220v)
 
## Software
* need a macro to control a pause command (chilipeppr_pause clean)
* switch the vcleaner on via REST/wifi
* get the insidediameter of pipe and make a zigzag move over the pcb
* make unpause if finished

## Todo's
* make github repository for this directory
* add additional hole in cambam plan
* write a small macro to control the vclenaer and make a zigzag move
