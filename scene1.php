<?php
include_once ('header.php');
include_once ('player.php');

//session_start();
// store session data
//$_SESSION['name']='alan';	

//start player instance, and grab fname from intro.php
//$user1 = new Player;
$name = $_GET['fname'];


//pass name to the player.php
//$user1->setName($name);
setName($name);

//get name based on userid
//$player1 = $user1->getName(1);
getName(1);



// SETS player stats - testing still
//$player1 = $user1->	
//$user1->setPlayerLevel(0);
//$player1Level = $user1->getPlayerLevel();	
//$user1->setPlayerHealth(100);
//$player1Health = $user1->getPlayerHealth();
//$_SESSION['health']= $playerHealth;
//$user1->setPlayerStrength(0);
//$player1Strength = $user1->getPlayerStrength();
//$user1->setPlayerKindness(0);
//$player1Kindness = $user1->getPlayerKindness();
//$allPlayer1Stats = array($player1,$player1Level,$player1Health,$player1Strength,$player1Kindness);

//$arrlength=count($allPlayer1Stats);




?>
<div class="lists">
<font>
<h1>Scene I<h2>
 
You are standing on a curb in a small town (details)... 
you realize that you have a fresh start. 
There is $1500 in your pocket and all you own in a blue jansport backpack on your back.
<br /><br />
You look around and there is a convienent store, unemployement office, and a hotel.
It is a name brand 4 star.
Since you don't have anywhere to be or anyone to see, you decide to get a start on establising your self in this new town.
<br /><br />
 <form action="index.php" method="POST">
Where do you want to start <?php echo " " . $player1; ?>?
 </br>
<ul>
<li><input type="radio" name="choice" value="2"/>1. convenient store</li>
<li><input type="radio" name="choice" value="3"/>2. hotel</li>
<li><input type="radio" name="choice" value="4"/>3. unemployment office</li>
</ul>
</br>
<br ?>
<input type="submit" Value="Enter">


</form>
</font>
</div>
<?php
include_once ('footer.php');

?>