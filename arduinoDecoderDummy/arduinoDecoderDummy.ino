/*
  AnalogReadSerial
  Reads an analog input on pin 0, prints the result to the serial monitor.
  Attach the center pin of a potentiometer to pin A0, and the outside pins to +5V and ground.
 
 This example code is in the public domain.
 */

int counter = 0;
// the setup routine runs once when you press reset:
void setup() {
  // initialize serial communication at 9600 bits per second:
  Serial.begin(9600);
}

// the loop routine runs over and over again forever:
void loop() {
  counter++;
  // read the input on analog pin 0:
  int sensorValue = analogRead(A0);
  // print out the value you read:
  Serial.print("B");
  Serial.print("car:");
  Serial.print(sensorValue);
  Serial.print("time:");
  Serial.print(millis());
  
  Serial.print("counter");
  Serial.print(counter);
  Serial.println("E");
  delay(2000);        // delay in between reads for stability
}
