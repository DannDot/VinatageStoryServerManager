import pidusage from 'pidusage';

console.log('Testing pidusage...');
console.log('Current PID:', process.pid);

pidusage(process.pid, (err, stats) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Stats:', stats);
  }
});
