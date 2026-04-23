from datetime import datetime, date
from sqlalchemy.orm import Session
from . import models

def check_and_reset_daily(user_id: str, db: Session):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return None

    now = datetime.now()
    today = now.date()
    
    # Initialize last_activity_date if None
    if user.last_activity_date is None:
        user.last_activity_date = now
        db.commit()
        return user

    last_active = user.last_activity_date.date()
    
    if last_active < today:
        # It's a new day!
        
        # 1. Update Streak
        # Check if any medicines were taken on the last active day (yesterday)
        # However, since we reset 'taken' status every time we detect a new day,
        # we check the status BEFORE resetting.
        
        meds = db.query(models.Medication).filter(models.Medication.user_id == user.id).all()
        any_taken_last_active = False
        for med in meds:
            times = db.query(models.MedicationTime).filter(models.MedicationTime.medication_id == med.id).all()
            if any(t.taken for t in times):
                any_taken_last_active = True
                break
        
        # Streak logic:
        # If last_active was exactly yesterday and they took something: keep streak (it will be incremented when they take something today)
        # Actually, let's increment it here if they were successful yesterday?
        # User says: "if say i dont consume any mediicne that dsy the next day the streak will be back to 0"
        
        if (today - last_active).days == 1:
            if not any_taken_last_active:
                user.streak = 0
            # else: keep streak as is, it will increment when they take first dose today
        else:
            # They skipped one or more days entirely
            user.streak = 0
            
        # 2. Reset Doses for the new day
        for med in meds:
            times = db.query(models.MedicationTime).filter(models.MedicationTime.medication_id == med.id).all()
            for t in times:
                t.taken = False
        
        # 3. Update last_activity_date to today
        user.last_activity_date = now
        db.commit()
        
    return user

def update_streak_on_dose(user_id: str, db: Session):
    """Call this when a dose is marked as taken."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return
    
    now = datetime.now()
    today = now.date()
    
    # If they haven't incremented streak today, do it now
    if user.last_streak_date is None or user.last_streak_date.date() < today:
        user.streak += 1
        user.last_streak_date = now
        db.commit()
