


<?php

// Variables for connecting to your database.
// Note: Credentials removed for security. See .env.example for format.
 $hostname = getenv('DB_HOSTNAME') ?: '';
 $username = getenv('DB_USERNAME') ?: '';
 $dbname = getenv('DB_NAME') ?: '';
 $password = getenv('DB_PASSWORD') ?: '';

// Create connection	
 $mysqli = new mysqli($hostname, $username, $password, $dbname);

// check connection //
 if ($mysqli->connect_errno)
{
    printf("Connect failed: %s\n", $mysqli->connect_error);
     exit();
}
/////////////////////////////////
///////////////////////////////
///////////////////////////////

// $db = new mysqli($hostname, $username, $password, $dbname);

// $testq = $db->prepare("SELECT * FROM firstplace.Users");
// $testq->execute();
// $testq->bind_result($userid, $username, $password);

// while ($testq->fetch())
// {
    // printf ("%s %s\n %s", $userid, $username, $password);
    // echo "<br />";
	// echo "done";
// }



	//$result->close();

	
	//$mysqli->close();
	
	
	
	
	
	
	
	///////////// testing funcion and vars from include
	
	include_once('test2.php');
	
	echo $test1;
	echo $test2;
?>
