
<ul>
<li><a href="intro.php?p=damage">hurt</a></li>
<li><a href="intro.php?p=payout">pay</a></li>
</ul>
<?php 
if ($p = "damage") {
	$user1->decreaseHealth();
	echo "hurt ". $user1->getPlayerHealth();
}
elseif ($p = "payout") {
	echo "payed out";
}

?>