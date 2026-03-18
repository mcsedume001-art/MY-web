import tkinter as tk
from tkinter import ttk, messagebox
import math
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import numpy as np

class PotentiometerSimulator:
    def __init__(self, root):
        self.root = root
        self.root.title("Potentiometer - Comparison of EMFs of Two Cells")
        self.root.geometry("1300x800")
        self.root.configure(bg='#f0f5fa')
        
        # Experiment constants
        self.E0 = 2.0  # Potentiometer battery voltage (accumulator)
        self.wire_length = 100  # cm
        self.voltage_per_cm = self.E0 / self.wire_length
        
        # Cell EMFs (typical values)
        self.E1 = 1.52  # Leclanché cell
        self.E2 = 1.08  # Daniell cell
        
        # State variables
        self.jockey_pos = 50.0  # cm from A
        self.active_cell = 'E1'  # 'E1' or 'E2'
        self.K2_closed = True  # Key K2 state (True = closed for accurate measurement)
        self.measured_l1 = None
        self.measured_l2 = None
        self.galvanometer_sensitivity = 1.0
        
        # Data for graphical method
        self.graph_data = {'l1': [], 'l2': []}
        
        self.setup_ui()
        self.update_display()
        
    def setup_ui(self):
        # Main container
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))
        
        # Title
        title_label = ttk.Label(main_frame, text="Comparison of Electromotive Forces of Two Cells",
                                font=('Arial', 16, 'bold'))
        title_label.grid(row=0, column=0, columnspan=3, pady=10)
        
        # Theory frame
        theory_frame = ttk.LabelFrame(main_frame, text="Theory", padding="10")
        theory_frame.grid(row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)
        
        ttk.Label(theory_frame, text="E₁/E₂ = l₁/l₂", font=('Arial', 14, 'italic')).pack()
        ttk.Label(theory_frame, 
                 text="At balance point, potential difference across wire length l equals cell EMF").pack()
        
        # Circuit diagram frame (Canvas)
        self.setup_circuit_diagram(main_frame)
        
        # Controls frame
        controls_frame = ttk.LabelFrame(main_frame, text="Controls & Measurements", padding="10")
        controls_frame.grid(row=2, column=1, sticky=(tk.W, tk.E, tk.N, tk.S), padx=10, pady=5)
        
        # Jockey control
        ttk.Label(controls_frame, text="Jockey Position (cm):", font=('Arial', 10, 'bold')).grid(row=0, column=0, sticky=tk.W, pady=5)
        
        self.jockey_slider = ttk.Scale(controls_frame, from_=0, to=100, orient=tk.HORIZONTAL,
                                       length=300, command=self.on_jockey_move)
        self.jockey_slider.grid(row=1, column=0, columnspan=2, pady=5)
        self.jockey_slider.set(50)
        
        self.jockey_label = ttk.Label(controls_frame, text="50.0 cm", font=('Arial', 12))
        self.jockey_label.grid(row=2, column=0, columnspan=2, pady=5)
        
        # Two-way switch
        ttk.Label(controls_frame, text="Two-way switch:", font=('Arial', 10, 'bold')).grid(row=3, column=0, sticky=tk.W, pady=10)
        
        switch_frame = ttk.Frame(controls_frame)
        switch_frame.grid(row=4, column=0, columnspan=2, pady=5)
        
        self.switch_var = tk.StringVar(value="E1")
        ttk.Radiobutton(switch_frame, text="Cell E₁ (Leclanché)", variable=self.switch_var,
                       value="E1", command=self.on_switch_change).pack(side=tk.LEFT, padx=5)
        ttk.Radiobutton(switch_frame, text="Cell E₂ (Daniell)", variable=self.switch_var,
                       value="E2", command=self.on_switch_change).pack(side=tk.LEFT, padx=5)
        
        # Keys
        ttk.Label(controls_frame, text="Keys:", font=('Arial', 10, 'bold')).grid(row=5, column=0, sticky=tk.W, pady=10)
        
        self.K1_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(controls_frame, text="K₁ (closed)", variable=self.K1_var,
                       command=self.update_display).grid(row=6, column=0, sticky=tk.W)
        
        self.K2_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(controls_frame, text="K₂ (closed for accurate balance)", 
                       variable=self.K2_var, command=self.update_display).grid(row=7, column=0, sticky=tk.W)
        
        # Galvanometer display
        ttk.Label(controls_frame, text="Galvanometer:", font=('Arial', 10, 'bold')).grid(row=8, column=0, sticky=tk.W, pady=10)
        
        self.galvo_frame = ttk.Frame(controls_frame, relief=tk.SUNKEN, padding=10)
        self.galvo_frame.grid(row=9, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=5)
        
        self.galvo_canvas = tk.Canvas(self.galvo_frame, width=200, height=100, bg='white')
        self.galvo_canvas.pack()
        
        # Measurement buttons
        ttk.Label(controls_frame, text="Measurements:", font=('Arial', 10, 'bold')).grid(row=10, column=0, sticky=tk.W, pady=10)
        
        button_frame = ttk.Frame(controls_frame)
        button_frame.grid(row=11, column=0, columnspan=2, pady=5)
        
        ttk.Button(button_frame, text="Measure E₁ Balance", 
                  command=self.measure_e1).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Measure E₂ Balance", 
                  command=self.measure_e2).pack(side=tk.LEFT, padx=5)
        ttk.Button(button_frame, text="Reset Measurements", 
                  command=self.reset_measurements).pack(side=tk.LEFT, padx=5)
        
        # Results frame
        results_frame = ttk.LabelFrame(main_frame, text="Results", padding="10")
        results_frame.grid(row=2, column=2, sticky=(tk.W, tk.E, tk.N, tk.S), padx=10, pady=5)
        
        ttk.Label(results_frame, text="Stored lengths:", font=('Arial', 10, 'bold')).grid(row=0, column=0, columnspan=2, pady=5)
        
        self.l1_label = ttk.Label(results_frame, text="l₁ = --- cm")
        self.l1_label.grid(row=1, column=0, sticky=tk.W, pady=2)
        
        self.l2_label = ttk.Label(results_frame, text="l₂ = --- cm")
        self.l2_label.grid(row=2, column=0, sticky=tk.W, pady=2)
        
        ttk.Separator(results_frame, orient=tk.HORIZONTAL).grid(row=3, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=10)
        
        ttk.Label(results_frame, text="EMF Ratio:", font=('Arial', 12, 'bold')).grid(row=4, column=0, columnspan=2, pady=5)
        
        self.ratio_label = ttk.Label(results_frame, text="E₁ : E₂ = ?", font=('Arial', 14, 'italic'))
        self.ratio_label.grid(row=5, column=0, columnspan=2, pady=5)
        
        ttk.Button(results_frame, text="Calculate Ratio", 
                  command=self.calculate_ratio).grid(row=6, column=0, columnspan=2, pady=10)
        
        ttk.Button(results_frame, text="Graphical Method", 
                  command=self.show_graphical_method).grid(row=7, column=0, columnspan=2, pady=5)
        
        # Notes and precautions frame
        notes_frame = ttk.LabelFrame(main_frame, text="Notes & Precautions", padding="10")
        notes_frame.grid(row=3, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=10)
        
        notes_text = """• Ensure positive terminals of E₁ and E₂ are connected to positive of E₀
• Check for opposite deflections at ends A and B
• K₂ should be closed for accurate balance point
• 5 kΩ safety resistor protects galvanometer
• If same direction deflection at A and B: check polarity or E₀ may be discharged
• For graphical method, vary resistance and plot l₁ vs l₂"""
        
        ttk.Label(notes_frame, text=notes_text, justify=tk.LEFT).pack()
        
    def setup_circuit_diagram(self, parent):
        diagram_frame = ttk.LabelFrame(parent, text="Circuit Diagram", padding="10")
        diagram_frame.grid(row=2, column=0, sticky=(tk.W, tk.E, tk.N, tk.S), padx=10, pady=5)
        
        self.circuit_canvas = tk.Canvas(diagram_frame, width=400, height=400, bg='white')
        self.circuit_canvas.pack()
        
    def draw_circuit(self):
        self.circuit_canvas.delete("all")
        c = self.circuit_canvas
        
        # Draw potentiometer wire
        c.create_line(50, 200, 350, 200, width=3, fill='blue')
        c.create_text(30, 190, text='A', font=('Arial', 12, 'bold'))
        c.create_text(370, 190, text='B', font=('Arial', 12, 'bold'))
        
        # Draw jockey
        x_pos = 50 + (self.jockey_pos / 100) * 300
        c.create_line(x_pos, 150, x_pos, 200, width=2, fill='red', dash=(4, 2))
        c.create_oval(x_pos-8, 142, x_pos+8, 158, fill='orange', outline='red', width=2)
        c.create_text(x_pos, 130, text='Jockey', font=('Arial', 8))
        
        # Draw galvanometer
        c.create_oval(200, 50, 250, 100, outline='black', width=2)
        c.create_text(225, 75, text='G', font=('Arial', 14, 'bold'))
        c.create_text(225, 95, text='0', font=('Arial', 8))
        
        # Draw connections to galvanometer
        c.create_line(225, 100, 225, 150, width=2)
        c.create_line(225, 150, x_pos, 150, width=2)
        
        # Draw cells
        # E1 (Leclanché)
        c.create_rectangle(50, 280, 100, 320, outline='black', width=2)
        c.create_text(75, 300, text='E₁')
        c.create_line(75, 320, 75, 350, width=2)
        c.create_line(75, 350, 150, 350, width=2)
        c.create_text(40, 300, text='+', font=('Arial', 10, 'bold'))
        c.create_text(110, 300, text='-', font=('Arial', 10, 'bold'))
        
        # E2 (Daniell)
        c.create_rectangle(300, 280, 350, 320, outline='black', width=2)
        c.create_text(325, 300, text='E₂')
        c.create_line(325, 320, 325, 350, width=2)
        c.create_line(325, 350, 250, 350, width=2)
        c.create_text(290, 300, text='+', font=('Arial', 10, 'bold'))
        c.create_text(360, 300, text='-', font=('Arial', 10, 'bold'))
        
        # Two-way switch
        c.create_rectangle(150, 240, 250, 260, outline='black', width=2)
        c.create_text(200, 250, text='Two-way')
        c.create_line(200, 240, 200, 150, width=2)
        
        # Connections to cells
        c.create_line(200, 260, 100, 300, width=2, dash=(2, 2))
        c.create_line(200, 260, 300, 300, width=2, dash=(2, 2))
        
        # Keys
        c.create_rectangle(130, 360, 150, 380, outline='black', width=2, fill='lightgray')
        c.create_text(140, 370, text='K₁')
        
        c.create_rectangle(250, 360, 270, 380, outline='black', width=2, fill='lightgray')
        c.create_text(260, 370, text='K₂')
        
        # Safety resistor
        c.create_rectangle(80, 360, 120, 380, outline='black', width=2, fill='lightgray')
        c.create_text(100, 370, text='5kΩ')
        
        # E0 (accumulator)
        c.create_rectangle(50, 380, 100, 420, outline='black', width=2)
        c.create_text(75, 400, text='E₀')
        
    def on_jockey_move(self, value):
        self.jockey_pos = float(value)
        self.jockey_label.config(text=f"{self.jockey_pos:.1f} cm")
        self.draw_circuit()
        self.update_galvanometer()
        
    def on_switch_change(self):
        self.active_cell = self.switch_var.get()
        self.update_galvanometer()
        
    def update_galvanometer(self):
        self.galvo_canvas.delete("all")
        
        # Calculate voltage across AJ
        v_aj = self.jockey_pos * self.voltage_per_cm
        
        # Get cell EMF
        e_cell = self.E1 if self.active_cell == 'E1' else self.E2
        
        # Calculate deflection (simplified model)
        if not self.K1_var.get():  # K1 open
            deflection = 0
            status = "K₁ open - no current"
        elif not self.K2_var.get():  # K2 open (rough balance)
            # Less sensitive
            diff = (v_aj - e_cell) * 10
            deflection = max(-50, min(50, diff))
            status = "Rough balance (K₂ open)"
        else:  # K2 closed (accurate balance)
            diff = (v_aj - e_cell) * 100
            deflection = max(-50, min(50, diff))
            status = "Accurate balance (K₂ closed)"
        
        # Draw galvanometer
        self.galvo_canvas.create_oval(50, 20, 150, 120, outline='black', width=2)
        self.galvo_canvas.create_line(100, 70, 100, 20, width=2)
        self.galvo_canvas.create_line(100, 70, 100, 120, width=2)
        self.galvo_canvas.create_line(50, 70, 150, 70, width=2)
        
        # Draw needle
        center_x, center_y = 100, 70
        needle_length = 40
        angle = math.radians(deflection)  # Convert deflection to angle
        end_x = center_x + needle_length * math.sin(angle)
        end_y = center_y - needle_length * math.cos(angle)
        
        self.galvo_canvas.create_line(center_x, center_y, end_x, end_y, width=3, fill='red')
        self.galvo_canvas.create_oval(center_x-3, center_y-3, center_x+3, center_y+3, fill='black')
        
        # Add scale
        for i in range(-4, 5):
            x = center_x + 30 * math.sin(math.radians(i*15))
            y = center_y - 30 * math.cos(math.radians(i*15))
            if i == 0:
                self.galvo_canvas.create_text(x, y-10, text='0')
            else:
                self.galvo_canvas.create_line(x-2, y-2, x+2, y+2, width=2)
        
        # Status text
        self.galvo_canvas.create_text(100, 140, text=status, font=('Arial', 8))
        
        # Check for balance
        if abs(deflection) < 1:
            self.galvo_canvas.create_text(100, 160, text="✓ BALANCE", fill='green', font=('Arial', 10, 'bold'))
            
    def update_display(self):
        self.draw_circuit()
        self.update_galvanometer()
        
    def measure_e1(self):
        if self.active_cell != 'E1':
            messagebox.showwarning("Warning", "Switch to E₁ before measuring!")
            return
            
        # Find balance point
        balance_length = self.E1 / self.voltage_per_cm
        self.measured_l1 = balance_length
        self.jockey_slider.set(balance_length)
        self.jockey_pos = balance_length
        self.l1_label.config(text=f"l₁ = {balance_length:.1f} cm")
        self.update_display()
        messagebox.showinfo("Measurement", f"Balance point for E₁ found at {balance_length:.1f} cm")
        
    def measure_e2(self):
        if self.active_cell != 'E2':
            messagebox.showwarning("Warning", "Switch to E₂ before measuring!")
            return
            
        # Find balance point
        balance_length = self.E2 / self.voltage_per_cm
        self.measured_l2 = balance_length
        self.jockey_slider.set(balance_length)
        self.jockey_pos = balance_length
        self.l2_label.config(text=f"l₂ = {balance_length:.1f} cm")
        self.update_display()
        messagebox.showinfo("Measurement", f"Balance point for E₂ found at {balance_length:.1f} cm")
        
    def reset_measurements(self):
        self.measured_l1 = None
        self.measured_l2 = None
        self.l1_label.config(text="l₁ = --- cm")
        self.l2_label.config(text="l₂ = --- cm")
        self.ratio_label.config(text="E₁ : E₂ = ?")
        self.graph_data = {'l1': [], 'l2': []}
        messagebox.showinfo("Reset", "Measurements cleared")
        
    def calculate_ratio(self):
        if self.measured_l1 is None or self.measured_l2 is None:
            messagebox.showerror("Error", "Measure both cells first!")
            return
            
        if self.measured_l2 == 0:
            messagebox.showerror("Error", "l₂ cannot be zero!")
            return
            
        ratio = self.measured_l1 / self.measured_l2
        theoretical_ratio = self.E1 / self.E2
        percent_error = abs(ratio - theoretical_ratio) / theoretical_ratio * 100
        
        self.ratio_label.config(text=f"E₁ : E₂ = {ratio:.3f} : 1")
        messagebox.showinfo("Result", 
                           f"E₁/E₂ = {ratio:.3f}\n"
                           f"Theoretical ratio = {theoretical_ratio:.3f}\n"
                           f"Error = {percent_error:.2f}%")
        
    def show_graphical_method(self):
        if len(self.graph_data['l1']) < 2:
            # Generate some sample data if not enough measurements
            response = messagebox.askyesno("Graphical Method", 
                                          "Not enough data points. Generate sample data?")
            if response:
                self.generate_sample_data()
            else:
                return
                
        # Create new window for graph
        graph_window = tk.Toplevel(self.root)
        graph_window.title("Graphical Method - l₁ vs l₂")
        graph_window.geometry("600x500")
        
        # Create matplotlib figure
        fig, ax = plt.subplots(figsize=(6, 5))
        
        # Plot data
        ax.scatter(self.graph_data['l2'], self.graph_data['l1'], color='blue', s=50)
        
        # Add trend line
        if len(self.graph_data['l1']) >= 2:
            z = np.polyfit(self.graph_data['l2'], self.graph_data['l1'], 1)
            p = np.poly1d(z)
            ax.plot(self.graph_data['l2'], p(self.graph_data['l2']), "r--", alpha=0.8,
                   label=f"Slope = {z[0]:.3f}")
            ax.legend()
        
        ax.set_xlabel('l₂ (cm)')
        ax.set_ylabel('l₁ (cm)')
        ax.set_title('Graphical Determination of E₁/E₂ Ratio')
        ax.grid(True, alpha=0.3)
        
        # Add to window
        canvas = FigureCanvasTkAgg(fig, master=graph_window)
        canvas.draw()
        canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True)
        
        # Add info text
        info_text = f"Slope of graph = E₁/E₂ = {z[0]:.3f}" if len(self.graph_data['l1']) >= 2 else "Add more points for trend line"
        ttk.Label(graph_window, text=info_text, font=('Arial', 10)).pack(pady=5)
        
    def generate_sample_data(self):
        """Generate sample data for graphical method"""
        import random
        
        # Clear existing data
        self.graph_data = {'l1': [], 'l2': []}
        
        # Generate 5 data points with some variation
        for i in range(5):
            r_factor = 0.8 + 0.4 * random.random()  # Variation in resistance
            # l2 varies with resistance, l1 proportional to E1/E2 * l2
            l2 = 30 + 40 * random.random()
            l1 = (self.E1 / self.E2) * l2 * (0.95 + 0.1 * random.random())
            
            self.graph_data['l2'].append(l2)
            self.graph_data['l1'].append(l1)
            
        messagebox.showinfo("Data Generated", 
                           f"Generated {len(self.graph_data['l1'])} data points")

def main():
    root = tk.Tk()
    app = PotentiometerSimulator(root)
    root.mainloop()

if __name__ == "__main__":
    main()