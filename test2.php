<?php
$test1 = "test one";

function ftest1()
{
	echo "ftest1";
	echo "</br>";
	echo "</br>";
	
}

function ftest2()
{
	global $test1;
	$test2 = "test two";
	echo $test1;
	echo "</br>";
	echo "</br>";
	echo "done";
}

?>