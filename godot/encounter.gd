extends RefCounted
## Visible, interruptible enemy wind-up. Aim is locked when the cue begins.
static func ranged_step(enemy, target, dt, visible):
 if enemy.type not in ["spitter","keeper"] or enemy.hp<=0:return []
 if not visible or float(enemy.get("stagger",0))>0:
  enemy.windup=0.0
  return []
 var windup=float(enemy.get("windup",0))
 if windup>0:
  enemy.windup=maxf(0,windup-dt)
  if enemy.windup>0:return []
  var aim=enemy.get("shot_aim",Vector2.LEFT)
  enemy.cooldown=3.1 if enemy.type=="keeper" else 2.3
  var velocities=[]
  for angle in ([-.20,0,.20] if enemy.type=="keeper" else [0]):velocities.append(aim.rotated(angle)*175.0)
  return velocities
 if enemy.cooldown<=0:
  enemy.windup=.70 if enemy.type=="keeper" else .55
  var aim=(target-Vector2(enemy.x,enemy.y)).normalized()
  enemy.shot_aim=Vector2.LEFT if aim.is_zero_approx() else aim
 return []
