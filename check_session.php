<?php

#######################################
## checks for current session		 ##
##writes a session if needed		 ##
##returns userid if session exists   ##
##otherwise will prompt to register  ##
#######################################

if (isset($_COOKIE['trarpgsession'])) 
{
	echo "cookie set";
	
}
else

setcookie(trarpgsession, 1);
echo $_COOKIE["trarpgsession"];
echo "cookie done";

?>
