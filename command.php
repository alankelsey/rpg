<font>Please Choose</font>
<form action="intro.php" method="post">
Choice: <input type="text" name="userchoice">
<input type="submit" value="next">
</form>
<?php include_once 'command.php'; 
$user1->decreaseHealth();

$player1Health = $user1->getPlayerHealth();
echo "to intro";
echo $player1Health;
?>