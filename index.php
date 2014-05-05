<?php
//session_start();
// store session data
//$_SESSION['name']='alan';
//require_once('check_session.php');
include_once ('header.php');
?>

<div id="container">


	<div id="menu">
		<a href="index.php?p=home">Home</a>
		<a href="index.php?p=aboutus">about us</a>
		<a href="index.php?p=contactus">Contact us</a>
		<a href="index.php?p=news">News</a>


	</div>
	<a href="index.php">index.php</a>
	<div>
	
	
	</div>
	<div id="content">
    <body>
		<?php
		$retunnum = $_POST["choice"] ;
	
		include_once ('sceneselect.php');
		$nextscene = getPageNumber($retunnum);
	
		?>
	</body>
    
		<div>
	<?php include_once 'footer.php'; ?>
	</div>

</div>

</div>

