<?php	


//Variables for connecting to your database.
// Note: Credentials removed for security. See .env.example for format.
	$hostname = getenv('DB_HOSTNAME') ?: '';
	$username = getenv('DB_USERNAME') ?: '';
	$dbname = getenv('DB_NAME') ?: '';
	$password = getenv('DB_PASSWORD') ?: '';

// Create connection	
$con = mysqli_connect($hostname, $username, $password, $dbname);
	
function connectdb()
{

global $con;
	
	// Check connection
	if (mysqli_connect_errno($con))
  	{
		echo "Failed to connect to MySQL: " . mysqli_connect_error();
  	}
	else
	{
		echo "connected";	
	}//echo "<br>";

	//echo $sqlst . " start of result";
	//$result = mysqli_query($con, $sqlst);
	//return $sqlst;
	//echo  $result;
	//echo  $mysqli_result;
	//echo " end of result";
}

######
#discontect function
######
function disconnectdb()
{
	
	mysqli_close($con);
}

function statement($sqlst)
{
	global $con;
	//$result = mysqli_query($con,$sqlst);
	echo "submiting statement ";
	$result = mysqli_query($con, $sqlst);
	
	if (!$check1_res) 
	{
		printf("Error: %s\n", mysqli_error($con));
		exit();
	}
	else 
	{

	return $result;
	}
	
	//while($row = mysqli_fetch_array($result))
	//{
	//	echo $row['FirstName'] . " " . $row['LastName'];
	//	echo "<br>";
	//}
	//echo "test " .$sqlst .  " " . $con . " end";
}

      

// if (!$check1_res) {
    // printf("Error: %s\n", mysqli_error($con));
    // exit();
// }


  
?>
