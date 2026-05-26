
"""
Main script to run offline analysis on KantSpeak logs.
Generates summary statistics, plots, and exports results.
"""

import os
import pandas as pd
from load_logs import load_all_sessions, filter_event
from metrics import compute_accuracy_by_session, compute_accuracy_by_activity, compute_response_time_stats, compute_group_metrics
from stats import t_test_groups, anova_activities
from visualization import plot_learning_curves, plot_accuracy_by_activity, plot_group_comparison

def ensure_output_dir(dirname="output"):
    if not os.path.exists(dirname):
        os.makedirs(dirname)

def main():
    print("Loading session logs...")
    df = load_all_sessions("../data/sessions/")
    if df.empty:
        print("No session logs found. Please run experiments first.")
        return

    ensure_output_dir("output")

    # Filter only check events for most metrics
    df_checks = filter_event(df, 'check')

    # Basic stats
    total_sessions = df['session'].nunique()
    total_events = len(df)
    print(f"Total sessions: {total_sessions}")
    print(f"Total events logged: {total_events}")

    # Accuracy metrics
    acc_by_session = compute_accuracy_by_session(df_checks)
    acc_by_activity = compute_accuracy_by_activity(df_checks)
    response_stats = compute_response_time_stats(df_checks)

    print("\n=== Accuracy by Session ===")
    print(acc_by_session)
    print("\n=== Accuracy by Activity ===")
    print(acc_by_activity)
    print("\n=== Response Time Stats (seconds) ===")
    for k, v in response_stats.items():
        print(f"{k}: {v:.2f}")

    # Group comparison if experiment groups exist
    if 'experiment_group' in df_checks.columns and df_checks['experiment_group'].notna().any():
        group_metrics = compute_group_metrics(df_checks)
        print("\n=== Performance by Experimental Group ===")
        print(group_metrics)
        # T-test between control and adaptive (if both present)
        groups_present = df_checks['experiment_group'].unique()
        if 'control' in groups_present and 'adaptive' in groups_present:
            ttest_res = t_test_groups(df_checks, groups=('control', 'adaptive'))
            print("\n=== T-test: control vs adaptive (accuracy) ===")
            print(ttest_res)
        # ANOVA across activities (optional)
        if len(df_checks['activity'].unique()) >= 2:
            anova_res = anova_activities(df_checks)
            print("\n=== ANOVA across activities ===")
            print(anova_res)

    # Generate plots
    print("\nGenerating plots...")
    plot_accuracy_by_activity(df_checks, save_path="output/accuracy_by_activity.png")
    plot_learning_curves(df_checks, save_path="output/learning_curves.png")
    if 'experiment_group' in df_checks.columns and df_checks['experiment_group'].notna().any():
        plot_group_comparison(df_checks, save_path="output/group_comparison.png")
    else:
        print("No experiment group data available for group comparison plot.")

    # Export aggregated data
    acc_by_activity.to_csv("output/accuracy_by_activity.csv", index=False)
    acc_by_session.to_csv("output/accuracy_by_session.csv", index=False)
    if 'experiment_group' in df_checks.columns and not df_checks['experiment_group'].isna().all():
        group_metrics.to_csv("output/group_metrics.csv", index=False)
    print("Analysis complete. Results saved to 'output/' directory.")

if __name__ == "__main__":
    main()