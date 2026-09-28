<?php


function connectdb($sqlst)
{

##############################
#this starts the connection
##############################
//Variables for connecting to your database.
// Note: Credentials removed for security. See .env.example for format.
$hostname = getenv('DB_HOSTNAME') ?: '';
 $username = getenv('DB_USERNAME') ?: '';
 $dbname = getenv('DB_NAME') ?: '';

 $password = getenv('DB_PASSWORD') ?: '';
//$usertable = "Users";
 //$yourfield = "username"; 

// Create connection
$con = mysqli_connect($hostname, $username, $password, $dbname);

 
// Check connection
if (mysqli_connect_errno($con))
  {
  echo "Failed to connect to MySQL: " . mysqli_connect_error();
  }
 echo "connected";	
echo "<br>";

mysqli_query($con, $sqlst);
	return $sqlst;
	echo "returnedd";
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
	connectdb();
	$result = mysqli_query($con,$sqlst);
	return $result;
// while($row = mysqli_fetch_array($result))
  // {
  // echo $row['FirstName'] . " " . $row['LastName'];
  // echo "<br>";
  // }
}

      

// if (!$check1_res) {
    // printf("Error: %s\n", mysqli_error($con));
    // exit();
// }


  
?>