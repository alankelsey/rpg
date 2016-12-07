
<?php 
include_once ('player.php'); 
//$user1 = new Player;

//$player1name = $user1->getName(1);
$player1name = getName(1)

?>



<ul>

<li><font><?php echo " " . $player1name; ?></font></li>

<li><font>LEVEL <?php  echo $player1Level . "/100"; ?></font></li>
<li><font>HEALTH <?php echo $playerHealth . "/100"; ?> </font></li>
<li><font>STRENGTH <?php echo $player1Strength . "/100"; ?></font></li>
<li><font>KINDNESS<?php echo $player1Kindness . "/100"; ?></font></li>
<li><font><?php $name = $_GET['fname']; echo $name; ?></font></li>


</ul>
