<?php

//selects current scene that you are on



// $selection = $_POST['choice'];
	
	// if ($selection == 1) {
		 // $currentScene = "scene2.php"; include ($currentScene);
	// }
	// elseif ($selection == 2) {
		// $currentScene = "scene3.php"; include ($currentScene);
	// }
	// elseif ($selection == 3) {
		// $currentScene = "scene3.php"; include ($currentScene);
	// }
	// else {
		// $currentScene = "intro.php"; include ($currentScene);
		// }
function getPageNumber($nextpage)
{
	$selection = $nextpage;	
	//$count = 0;
	//echo "page " . $nextpage;
	//echo "count " . $count . " ";
	
	$gotoscene = "scene" . $nextpage . ".php";
	//echo "next- " . $gotoscene;
	if ($nextpage < 1) {
		 
		 include ('intro.php');
	}
	elseif ($selection == 1) {
		$currentScene = $gotoscene; 
		include ($currentScene);
	}
	elseif ($selection == 2) {
		$currentScene = $gotoscene; 
		include ($currentScene);
	}
	else {
		$currentScene = $gotoscene; return include ($currentScene);
		}

}


?>